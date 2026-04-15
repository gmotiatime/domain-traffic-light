import os

filepath = "src/index.css"
with open(filepath, "r") as f:
    content = f.read()

white_theme = """
  .white-theme {
    --background: 0 0% 100%;
    --foreground: 0 0% 0%;
    --primary: 0 0% 0%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 0%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 40%;
    --accent: 0 0% 96%;
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 0 0% 0%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 0%;
    --panel: 0 0% 98%;
    --panel-foreground: 0 0% 0%;
  }
"""

if ".white-theme" not in content:
    content = content.replace("  }", "  }" + white_theme, 1)

theme_svg_blend = """
  .theme-svg-blend {
    mix-blend-mode: screen;
  }
  .white-theme .theme-svg-blend {
    mix-blend-mode: multiply;
  }
"""

if ".theme-svg-blend" not in content:
    content = content.replace("@layer utilities {", "@layer utilities {" + theme_svg_blend, 1)

with open(filepath, "w") as f:
    f.write(content)

print("Patched css")
