import base64, os

with open("Y:/texasholdem/files/back/04_flux-2_casino_interior.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

dataurl = f"data:image/png;base64,{b64}"

players = """<div class="player-dot other" style="position:absolute;top:8%;left:50%">B</div><div class="player-dot other active" style="position:absolute;top:35%;left:10%">C</div><div class="player-dot me" style="position:absolute;top:85%;left:50%">Y</div><div class="player-dot other" style="position:absolute;top:35%;left:88%">D</div>"""
table = f"""<div class="mock-table"><div class="table-oval"><div class="table-rail"></div><div class="table-neon-ring"></div><div class="table-felt"><div class="mini-cards"><div class="mini-card"></div><div class="mini-card"></div><div class="mini-card"></div></div><div class="mini-pot">POT $2,400</div></div></div>{players}</div>"""

def card(choice, cls, label, title, desc, has_overlay=False):
    overlay = '<div class="overlay"></div>' if has_overlay else ''
    return f"""
  <div class="card" data-choice="{choice}" onclick="toggleSelect(this)">
    <span class="selected-badge">選択中</span>
    <div class="preview {cls}">
      <div class="bg" style="background-image:url('{dataurl}')"></div>
      {overlay}
      {table}
      <span class="label-tag">{label}</span>
    </div>
    <div class="footer"><div class="ftitle">{title}</div><div class="fdesc">{desc}</div></div>
  </div>"""

html = """<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #fff; font-family: Arial, sans-serif; padding: 16px; }
  h1 { text-align: center; font-size: 15px; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .subtitle { text-align: center; color: rgba(255,255,255,0.4); font-size: 11px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 500px; margin: 0 auto; }
  .card { border-radius: 12px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; position: relative; }
  .card:hover { transform: translateY(-2px); }
  .card.selected { border-color: #bf80ff; box-shadow: 0 0 20px rgba(180,50,255,0.5); }
  .selected-badge { display: none; position: absolute; top: 6px; right: 6px; background: #bf80ff; color: #1a1a1a; font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 10px; z-index: 20; }
  .card.selected .selected-badge { display: block; }
  .preview { position: relative; height: 220px; overflow: hidden; }
  .bg { position: absolute; inset: 0; background-size: cover; background-position: center 30%; }
  .blur-only .bg { filter: blur(6px); transform: scale(1.08); }
  .dark-only .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
  .blur-dark .bg { filter: blur(5px); transform: scale(1.08); }
  .blur-dark .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
  .blur-purple .bg { filter: blur(5px); transform: scale(1.08); }
  .blur-purple .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,0,60,0.65) 0%, rgba(10,0,30,0.75) 100%); }
  .mock-table { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10; }
  .table-oval { width: 130px; height: 75px; border-radius: 50%; position: relative; }
  .table-rail { position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(175deg, #3a1a60 0%, #1a0035 100%); box-shadow: 0 0 20px rgba(150,0,255,0.4), 0 4px 16px rgba(0,0,0,0.8); }
  .table-neon-ring { position: absolute; inset: 6px; border-radius: 50%; border: 1.5px solid rgba(180,50,255,0.7); box-shadow: 0 0 8px rgba(180,50,255,0.5); }
  .table-felt { position: absolute; inset: 10px; border-radius: 50%; background: radial-gradient(ellipse at 50% 40%, rgba(20,0,55,0.95) 0%, rgba(8,0,30,1) 100%); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 3px; }
  .mini-cards { display: flex; gap: 2px; }
  .mini-card { width: 12px; height: 17px; border-radius: 2px; background: linear-gradient(135deg,#fff,#eee); box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .mini-pot { font-size: 7px; color: #bf80ff; font-family: monospace; font-weight: bold; }
  .player-dot { position: absolute; transform: translate(-50%,-50%); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; z-index: 11; }
  .player-dot.me { background: linear-gradient(135deg, #bf80ff, #7c3aed); box-shadow: 0 0 10px rgba(180,50,255,0.7); color: #fff; width: 26px; height: 26px; }
  .player-dot.other { background: rgba(20,0,50,0.9); border: 1px solid rgba(180,50,255,0.4); color: #bf80ff; }
  .player-dot.active { border: 1.5px solid #bf80ff; box-shadow: 0 0 14px rgba(180,50,255,0.9); animation: pdp 1.5s ease-in-out infinite; }
  @keyframes pdp { 0%,100%{box-shadow:0 0 10px rgba(180,50,255,0.7)} 50%{box-shadow:0 0 20px rgba(180,50,255,1)} }
  .label-tag { position: absolute; top: 6px; left: 6px; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; font-weight: bold; padding: 2px 8px; border-radius: 10px; z-index: 20; background: rgba(180,50,255,0.2); color: #bf80ff; border: 1px solid rgba(180,50,255,0.3); }
  .footer { padding: 8px 10px; background: rgba(10,5,20,0.95); }
  .ftitle { font-size: 11px; font-weight: bold; color: #bf80ff; margin-bottom: 2px; }
  .fdesc { font-size: 9px; color: rgba(255,255,255,0.5); line-height: 1.4; }
</style>
<script>
function toggleSelect(el) {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  if (window.recordChoice) recordChoice(el.dataset.choice, el.querySelector('.ftitle').textContent);
}
</script>
</head>
<body>
<h1>04 フィルター比較</h1>
<p class="subtitle">テーブルを重ねた状態で。どれが好き？</p>
<div class="grid">
"""

html += card("a", "blur-only",   "A", "ブラーのみ",     "煙の雰囲気は残る", False)
html += card("b", "dark-only",   "B", "黒フィルターのみ","暗くしてUI読みやすく", True)
html += card("c", "blur-dark",   "C", "ブラー＋黒",     "テーブルが一番主役", True)
html += card("d", "blur-purple", "D", "ブラー＋紫",     "ネオンと色調が統一", True)

html += """
</div>
<div style="height:24px;"></div>
</body>
</html>"""

out = "Y:/texasholdem/.superpowers/brainstorm/34384-1776830667/content/filter-compare-v2.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("done", os.path.getsize(out), "bytes")
