"""Renders the trainer's art: the cards, the chip, and the opening film.

Run headless from the repository root:

    blender -b --factory-startup -P blender/art.py -- stills
    blender -b --factory-startup -P blender/art.py -- film
    blender -b --factory-startup -P blender/art.py -- film --frame 70   # one frame, to check

Output goes to web/public/art/. Cycles on the CPU, so it runs anywhere.
"""

import math
import os
import sys

import bmesh
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web", "public", "art")
FONT = os.path.join(ROOT, "blender", "fonts", "Newsreader72pt-Medium.ttf")

# A playing card is 63 x 88 mm. One unit here is about 25 mm.
CARD_W, CARD_H, CARD_T, CARD_R = 2.5, 3.5, 0.03, 0.16

# The page's colours (web/src/styles/tokens.css), as sRGB.
RED = (0.957, 0.165, 0.243)
RED_LIGHT = (0.975, 0.36, 0.42)
INK = (0.09, 0.09, 0.09)
PAPER = (0.985, 0.98, 0.97)


def linear(srgb):
    """sRGB triple to the linear RGBA Blender materials expect."""
    def channel(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (*(channel(c) for c in srgb), 1.0)


def material(name, srgb, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = linear(srgb)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Specular IOR Level"].default_value = 0.2  # matte: keep colours true
    return mat


def add_object(name, mesh, mat, parent=None, z=0.0):
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    obj.location.z = z
    obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj


def rounded_rect_points(width, height, radius, steps=12):
    """The outline of a rounded rectangle centred on the origin, anticlockwise."""
    points = []
    centres = [(width / 2 - radius, height / 2 - radius, 0.0),
               (-width / 2 + radius, height / 2 - radius, 90.0),
               (-width / 2 + radius, -height / 2 + radius, 180.0),
               (width / 2 - radius, -height / 2 + radius, 270.0)]
    for cx, cy, start in centres:
        for step in range(steps + 1):
            angle = math.radians(start + 90.0 * step / steps)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def slab_mesh(name, width, height, radius, thickness):
    """A rounded rectangle with thickness: the body of a card."""
    bm = bmesh.new()
    face = bm.faces.new([bm.verts.new((x, y, 0.0)) for x, y in rounded_rect_points(width, height, radius)])
    extruded = bmesh.ops.extrude_face_region(bm, geom=[face])
    top = [v for v in extruded["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0.0, 0.0, thickness))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def band_mesh(name, outer, inner):
    """A flat band between two outlines that have the same number of points."""
    bm = bmesh.new()
    outer_verts = [bm.verts.new((x, y, 0.0)) for x, y in outer]
    inner_verts = [bm.verts.new((x, y, 0.0)) for x, y in inner]
    count = len(outer)
    for i in range(count):
        j = (i + 1) % count
        bm.faces.new((outer_verts[i], outer_verts[j], inner_verts[j], inner_verts[i]))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def outline_mesh(name, width, height, radius, line):
    """A thin rounded-rectangle outline, lying flat."""
    return band_mesh(name,
                     rounded_rect_points(width, height, radius),
                     rounded_rect_points(width - 2 * line, height - 2 * line, radius - line))


def circle_points(radius, steps=96):
    return [(radius * math.cos(i * math.tau / steps), radius * math.sin(i * math.tau / steps)) for i in range(steps)]


def letter(name, text, size, mat, parent, x=0.0, y=0.0, z=0.0, upside_down=False):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.font = bpy.data.fonts.load(FONT, check_existing=True)
    curve.size = size
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.extrude = 0.002
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    obj.location = (x, y, z)
    obj.rotation_euler.z = math.pi if upside_down else 0.0
    obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj


class Palette:
    """The materials, made once per scene."""

    def __init__(self):
        self.paper = material("paper", PAPER, 0.6)
        self.ink = material("ink", INK, 0.5)
        self.red = material("red", RED, 0.45)
        self.red_light = material("red light", RED_LIGHT, 0.45)


def build_card(name, rank, palette):
    """A card lying face up at the origin: `rank` on top, the red back below.

    Returns the card body; everything else is parented to it, so moving or
    turning the body moves the whole card.
    """
    body = add_object(name, slab_mesh(name, CARD_W, CARD_H, CARD_R, CARD_T), palette.paper)
    bevel = body.modifiers.new("soft edge", "BEVEL")
    bevel.width = 0.008
    bevel.segments = 3

    face_z = CARD_T + 0.0006
    add_object(name + " frame", outline_mesh("frame", CARD_W - 0.22, CARD_H - 0.22, CARD_R - 0.06, 0.014),
               palette.red, body, face_z)
    letter(name + " rank", rank, 2.1, palette.ink, body, y=0.04, z=face_z)
    corner_x, corner_y = CARD_W / 2 - 0.36, CARD_H / 2 - 0.44
    letter(name + " index", rank, 0.46, palette.red, body, -corner_x, corner_y, face_z)
    letter(name + " index flipped", rank, 0.46, palette.red, body, corner_x, -corner_y, face_z, upside_down=True)

    # The back faces down, so its parts sit just under the body.
    back_z = -0.0006
    back = add_object(name + " back", slab_mesh("back", CARD_W - 0.2, CARD_H - 0.2, CARD_R - 0.05, 0.0004),
                      palette.red, body, back_z - 0.0004)
    diamond = bpy.data.meshes.new("diamond")
    bm = bmesh.new()
    cols, rows, step = 7, 10, 0.29
    for col in range(cols):
        for row in range(rows):
            x = (col - (cols - 1) / 2) * step
            y = (row - (rows - 1) / 2) * step
            half = 0.075
            verts = [bm.verts.new((x + dx, y + dy, 0.0)) for dx, dy in ((half, 0), (0, half), (-half, 0), (0, -half))]
            bm.faces.new(verts)
    bm.to_mesh(diamond)
    bm.free()
    add_object(name + " pattern", diamond, palette.red_light, body, back_z - 0.0012)
    return body


def build_chip(palette):
    """A chip lying flat: a red disc with a white ring and white rim marks."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1.0, depth=0.2, location=(0, 0, 0.1))
    chip = bpy.context.object
    chip.name = "chip"
    chip.data.materials.append(palette.red)
    bevel = chip.modifiers.new("soft edge", "BEVEL")
    bevel.width = 0.03
    bevel.segments = 4
    bpy.ops.object.shade_smooth()

    ring = band_mesh("ring", circle_points(0.74), circle_points(0.62))
    add_object("chip ring", ring, palette.paper, chip, 0.1012)

    for i in range(6):
        angle = i * math.tau / 6
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.9 * math.cos(angle), 0.9 * math.sin(angle), 0.1))
        mark = bpy.context.object
        mark.scale = (0.16, 0.28, 0.2024)
        mark.rotation_euler.z = angle
        mark.data.materials.append(palette.paper)
        mark.parent = chip
        mark.matrix_parent_inverse = chip.matrix_world.inverted()
    return chip


def new_scene(width, height, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("soft light")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.68
    scene.world = world
    return scene


def add_light(location, energy, size):
    data = bpy.data.lights.new("key", "AREA")
    data.energy = energy
    data.size = size
    light = bpy.data.objects.new("key", data)
    light.location = location
    bpy.context.scene.collection.objects.link(light)
    aim(light, (0, 0, 0))
    return light


def add_camera(location, target, ortho_scale=None, lens=50):
    data = bpy.data.cameras.new("camera")
    if ortho_scale is not None:
        data.type = "ORTHO"
        data.ortho_scale = ortho_scale
    data.lens = lens
    camera = bpy.data.objects.new("camera", data)
    camera.location = location
    bpy.context.scene.collection.objects.link(camera)
    aim(camera, target)
    bpy.context.scene.camera = camera
    return camera


def aim(obj, target):
    direction = tuple(t - o for t, o in zip(target, obj.location))
    from mathutils import Vector
    obj.rotation_euler = Vector(direction).to_track_quat("-Z", "Y").to_euler()


def render(path, file_format="WEBP"):
    scene = bpy.context.scene
    scene.render.filepath = path
    scene.render.image_settings.file_format = file_format
    scene.render.image_settings.color_mode = "RGBA"
    if file_format == "WEBP":
        scene.render.image_settings.quality = 92
    bpy.ops.render.render(write_still=True)
    print("wrote", path)


# ─── Stills ──────────────────────────────────────────────────────────────

def render_cards():
    """Each card flat on, with no shadow: the page adds its own."""
    for rank in ("J", "Q", "K"):
        new_scene(520, 720, 96)
        build_card("card", rank, Palette())
        add_light((-3.0, 3.5, 6.0), 150, 5.0)
        add_camera((0, 0, 10), (0, 0, 0), ortho_scale=3.62)
        render(os.path.join(OUT, f"card-{rank.lower()}.webp"))

    new_scene(520, 720, 96)
    card = build_card("card", "K", Palette())
    card.rotation_euler.y = math.pi
    card.location.z = CARD_T
    add_light((-3.0, 3.5, 6.0), 150, 5.0)
    add_camera((0, 0, 10), (0, 0, 0), ortho_scale=3.62)
    render(os.path.join(OUT, "card-back.webp"))


def render_chip():
    """One chip seen from a seat at the table. The page stacks copies of it."""
    new_scene(360, 240, 128)
    build_chip(Palette())
    add_light((-2.5, -2.0, 5.0), 110, 4.0)
    add_camera((0, -6.0, 5.6), (0, 0, 0.08), ortho_scale=2.9)
    render(os.path.join(OUT, "chip.webp"))


def render_icon():
    """The browser tab icon: the King, tilted. One render per size, so each is sharp."""
    for size in (32, 180, 512):
        new_scene(size, size, 128)
        card = build_card("card", "K", Palette())
        card.rotation_euler.z = math.radians(-8)
        add_light((-3.0, 3.5, 6.0), 150, 5.0)
        add_camera((0, 0, 10), (0, 0, 0), ortho_scale=4.1)
        render(os.path.join(OUT, f"icon-{size}.png"), "PNG")


# ─── Film ────────────────────────────────────────────────────────────────

FPS = 30
FILM_FRAMES = 96


def ease(t):
    """Smooth start and stop, clamped to 0..1."""
    t = min(max(t, 0.0), 1.0)
    return t * t * (3.0 - 2.0 * t)


def pose_film(cards, frame):
    """Where every card is at `frame`. Motion is a pure function of the frame.

    Three cards slide in face down, one after another, into a fan. Then the
    middle card lifts, turns over and lands: the King.
    """
    for i, card in enumerate(cards):
        arrive = ease((frame - 4 - i * 9) / 30)
        rest_x = (i - 1) * 2.8
        card.location.x = rest_x + (1.0 - arrive) * 9.0
        card.location.y = (1.0 - arrive) * 0.6
        card.rotation_euler.z = math.radians((i - 1) * -5) * arrive
        card.rotation_euler.y = math.pi
        card.location.z = CARD_T + i * 0.004

    turn = ease((frame - 54) / 30)
    middle = cards[1]
    middle.rotation_euler.y = math.pi * (1.0 - turn)
    middle.location.z += math.sin(turn * math.pi) * 1.0 + CARD_T * (turn - 1.0)


def build_film():
    scene = new_scene(1280, 720, 72)
    scene.render.fps = FPS
    palette = Palette()
    cards = [build_card(f"card {rank}", rank, palette) for rank in ("J", "K", "Q")]

    bpy.ops.mesh.primitive_plane_add(size=60)
    floor = bpy.context.object
    floor.is_shadow_catcher = True

    add_light((-4.0, -3.0, 8.0), 330, 3.5)
    add_camera((0, -6.2, 12.6), (0, 0.25, 0), lens=50)

    # Composite over white, so the film sits on the page's white table card.
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    layers = tree.nodes.new("CompositorNodeRLayers")
    over = tree.nodes.new("CompositorNodeAlphaOver")
    over.inputs[1].default_value = (1, 1, 1, 1)
    output = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(layers.outputs["Image"], over.inputs[2])
    tree.links.new(over.outputs["Image"], output.inputs["Image"])
    return scene, cards


def render_film(only_frame=None):
    scene, cards = build_film()

    def on_frame(current_scene, *_):
        pose_film(cards, current_scene.frame_current)

    bpy.app.handlers.frame_change_pre.append(on_frame)

    if only_frame is not None:
        scene.frame_set(only_frame)
        pose_film(cards, only_frame)
        scene.render.filepath = os.path.join(OUT, f"film-check-{only_frame:03d}.png")
        scene.render.image_settings.file_format = "PNG"
        bpy.ops.render.render(write_still=True)
        return

    # The last frame doubles as the poster shown before the film loads.
    scene.frame_set(FILM_FRAMES)
    pose_film(cards, FILM_FRAMES)
    scene.render.filepath = os.path.join(OUT, "opening.jpg")
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
    bpy.ops.render.render(write_still=True)

    scene.frame_start, scene.frame_end = 1, FILM_FRAMES
    scene.render.filepath = os.path.join(OUT, "opening.mp4")
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "HIGH"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.ffmpeg.audio_codec = "NONE"
    bpy.ops.render.render(animation=True)
    print("wrote", scene.render.filepath)


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    os.makedirs(OUT, exist_ok=True)
    if not args or args[0] == "stills":
        render_cards()
        render_chip()
        render_icon()
    elif args[0] == "film":
        frame = int(args[args.index("--frame") + 1]) if "--frame" in args else None
        render_film(frame)
    else:
        sys.exit(f"unknown target: {args[0]}")


main()
