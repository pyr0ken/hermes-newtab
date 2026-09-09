import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('/home/omid/Code/fun/hermes-newtab/assets/icons', exist_ok=True)

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded rect / circle
    bg_color = (7, 9, 14, 255) # Deep obsidian
    border_color = (37, 99, 235, 255) # Electric blue
    
    margin = max(1, int(size * 0.05))
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=int(size * 0.25),
        fill=bg_color,
        outline=border_color,
        width=max(1, int(size * 0.06))
    )
    
    # Inner stylized H / Wings
    accent_blue = (59, 130, 246, 255)
    white = (248, 250, 252, 255)
    
    # Geometry for H with wing angles
    w = size
    h = size
    bar_w = max(2, int(w * 0.12))
    x1 = int(w * 0.28)
    x2 = int(w * 0.72)
    y1 = int(h * 0.25)
    y2 = int(h * 0.75)
    
    # Left vertical stem
    draw.rectangle([(x1 - bar_w//2, y1), (x1 + bar_w//2, y2)], fill=white)
    # Right vertical stem
    draw.rectangle([(x2 - bar_w//2, y1), (x2 + bar_w//2, y2)], fill=white)
    # Center crossbar
    cy = int(h * 0.5)
    draw.rectangle([(x1, cy - bar_w//2), (x2, cy + bar_w//2)], fill=accent_blue)
    
    # Wing flourishes on top
    wing_h = max(2, int(h * 0.12))
    draw.polygon([(x1 - bar_w//2, y1), (x1 - bar_w*1.5, y1 - wing_h), (x1 + bar_w//2, y1)], fill=accent_blue)
    draw.polygon([(x2 + bar_w//2, y1), (x2 + bar_w*1.5, y1 - wing_h), (x2 - bar_w//2, y1)], fill=accent_blue)
    
    return img

for s in [16, 32, 48, 128, 256]:
    icon = create_icon(s)
    icon.save(f'/home/omid/Code/fun/hermes-newtab/assets/icons/icon-{s}.png')

print("Icons generated successfully!")
