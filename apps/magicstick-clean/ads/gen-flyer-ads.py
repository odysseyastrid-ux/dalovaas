# Generates apps/magicstick-clean/ads/flyer-ads.html (6 display sizes x FR/EN) in the style of the owner's flyer.
T = {
 'fr': dict(tag='Ménage local · Bilingue', cats=['Résidentiel','Commercial','Grand<br>ménage','Entrée /<br>sortie'],
            price='30$<small>/H</small>', sub='Minimum 3 h · dès 90 $', sub_s='min. 3 h · dès 90 $',
            c1="Prix clairs, affichés d'avance.", c2='Réponse le jour même.', one='Prix clairs · <span class="g">réponse le jour même</span>', cta='Soumission gratuite →', cta_s='Soumission gratuite',
            av='Avant', ap='Après', real='Vraies photos de nos ménages'),
 'en': dict(tag='Local cleaning · Bilingual', cats=['Residential','Commercial','Deep<br>cleaning','Move-in /<br>move-out'],
            price='$30<small>/H</small>', sub='3-hour minimum · from $90', sub_s='3-h min · from $90',
            c1='Clear prices, shown up front.', c2='Same-day reply.', one='Clear prices · <span class="g">same-day reply</span>', cta='Get a free quote →', cta_s='Free quote',
            av='Before', ap='After', real='Real photos of our work'),
}
IMG = '../assets/images/'
def logo(mk, m, c, extra=''):
    return f'<div class="logo" style="{extra}"><svg class="mark" width="{mk}" height="{int(mk*.85)}"><use href="#mark"/></svg><div><div class="m" style="font-size:{m}px">MAGICSTICK</div><div class="c" style="font-size:{c}px">Clean</div></div></div>'
def cats(t, fs, pad, n=4):
    return '<div class="cats" style="font-size:%spx">%s</div>' % (fs, ''.join(f'<span style="padding:0 {pad}px">{x}</span>' for x in t['cats'][:n]))
def loc(fs, cities=('Rockland','Ottawa','Gatineau'), stack=False):
    pin = f'<svg width="{int(fs*.8)}" height="{fs}" viewBox="0 0 24 30"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 30 12 30s12-9.6 12-18.3C24 5.2 18.6 0 12 0z" fill="url(#g)"/><circle cx="12" cy="11.5" r="4.6" fill="#fff"/></svg>'
    if stack:
        return f'<div class="loc stack" style="font-size:{fs}px">{pin}' + ''.join(f'<b>{c}</b>' for c in cities) + '</div>'
    return f'<div class="loc" style="font-size:{fs}px">{pin}' + '<i></i>'.join(f'<b>{c}</b>' for c in cities) + '</div>'
def ba(pair, t, h, fs, vertical=False):
    b, a = pair
    d = 'grid-template-rows:1fr 1fr' if vertical else 'grid-template-columns:1fr 1fr'
    return (f'<div class="ba" style="height:{h}px;{d}"><figure><img src="{IMG}{b}" alt=""><figcaption style="font-size:{fs}px">{t["av"]}</figcaption></figure>'
            f'<figure><img src="{IMG}{a}" alt=""><figcaption style="font-size:{fs}px">{t["ap"]}</figcaption></figure></div>')
FRIDGE = ('before-fridge.jpg','after-fridge.jpg'); BATH = ('before-bathroom.jpg','after-bathroom.jpg'); FLOOR = ('before-hardwood-floor.jpg','after-hardwood-floor.jpg')

def ads(l, t):
    out = []
    # 1) 300x250
    out.append(f'''<div class="ad fl" id="flyer-{l}-300x250" style="width:300px;height:250px;padding:9px 12px 10px">
  <div class="scene" style="height:120px"><img src="{IMG}standard-tidy-livingroom.jpg" alt="" style="object-position:50% 70%"></div>
  {logo(30,13,21,'justify-content:center')}
  {cats(t,8,6,3)}
  <div class="pill" style="font-size:42px;margin:6px auto 0;width:186px;padding:3px 0 5px">{t['price']}<div class="ps" style="font-size:9.5px">{t['sub_s']}</div></div>
  <p class="claim" style="font-size:14px;margin-top:6px">{t['one']}</p>
  <div style="margin-top:auto">{loc(11)}<div class="cta" style="font-size:12px;padding:6px 0;margin-top:6px">{t['cta']}</div></div>
</div>''')
    # 2) 336x280
    out.append(f'''<div class="ad fl" id="flyer-{l}-336x280" style="width:336px;height:280px;padding:10px 13px 11px">
  <div class="scene" style="height:130px"><img src="{IMG}standard-tidy-livingroom.jpg" alt="" style="object-position:50% 70%"></div>
  {logo(34,14.5,24,'justify-content:center')}
  {cats(t,8.5,7,4)}
  <div class="pill" style="font-size:48px;margin:7px auto 0;width:210px;padding:3px 0 6px">{t['price']}<div class="ps" style="font-size:10.5px">{t['sub_s']}</div></div>
  <p class="claim" style="font-size:16px;margin-top:7px">{t['one']}</p>
  <div style="margin-top:auto">{loc(12.5)}<div class="cta" style="font-size:13px;padding:7px 0;margin-top:7px">{t['cta']}</div></div>
</div>''')
    # 3) 300x600
    out.append(f'''<div class="ad fl" id="flyer-{l}-300x600" style="width:300px;height:600px;padding:16px 14px 14px">
  <div class="scene" style="height:300px"><img src="{IMG}standard-tidy-livingroom.jpg" alt="" style="object-position:50% 75%"></div>
  {logo(52,19,32,'justify-content:center')}
  <p class="tag" style="font-size:8.5px;margin-top:5px">{t['tag']}</p>
  {cats(t,9,6,4)}
  <div class="pill" style="font-size:74px;margin:10px auto 0;width:250px;padding:4px 0 8px">{t['price']}<div class="ps" style="font-size:12px">{t['sub']}</div></div>
  <p class="claim" style="font-size:20px;margin-top:9px">{t['c1']}<br><span class="g">{t['c2']}</span></p>
  {ba(FRIDGE,t,118,8.5)}
  <div style="margin-top:auto">{loc(15)}<div class="cta" style="font-size:14px;padding:10px 0;margin-top:8px">{t['cta']}</div><p class="url" style="font-size:15px;margin-top:6px">magicstickclean.ca</p></div>
</div>''')
    # 4) 160x600
    out.append(f'''<div class="ad fl" id="flyer-{l}-160x600" style="width:160px;height:600px;padding:14px 10px 12px">
  <div class="scene" style="height:240px"><img src="{IMG}standard-tidy-livingroom.jpg" alt="" style="object-position:45% 75%"></div>
  <div style="text-align:center"><svg class="mark" width="56" height="48" style="margin:0 auto"><use href="#mark"/></svg><div class="m" style="font-size:15px;margin-top:2px">MAGICSTICK</div><div class="c" style="font-size:27px">Clean</div></div>
  <div class="vcats" style="font-size:8.5px;margin-top:7px">{''.join(f'<span>{x.replace("<br>"," ")}</span>' for x in t['cats'][:3])}</div>
  <div class="pill" style="font-size:44px;margin-top:9px;padding:4px 0 6px">{t['price']}<div class="ps" style="font-size:9px">{t['sub_s']}</div></div>
  <p class="claim" style="font-size:14px;margin-top:8px">{t['c1']}<br><span class="g">{t['c2']}</span></p>
  {ba(BATH,t,170,7.5,True)}
  <div style="margin-top:auto">{loc(12,stack=True)}<div class="cta" style="font-size:11px;padding:8px 0;margin-top:8px">{t['cta_s']} →</div></div>
</div>''')
    # 5) 970x250
    out.append(f'''<div class="ad fl" id="flyer-{l}-970x250" style="width:970px;height:250px;padding:0">
  <div class="wide">
    <div class="wl">{logo(56,23,38,'justify-content:center')}<p class="tag" style="font-size:9.5px;margin-top:6px">{t['tag']}</p>{cats(t,9.5,7,4)}</div>
    <div class="wm"><div class="pill" style="font-size:68px;width:250px;padding:4px 0 8px;margin:0 auto">{t['price']}<div class="ps" style="font-size:12.5px">{t['sub']}</div></div><p class="claim" style="font-size:19px;margin-top:9px">{t['c1']}<br><span class="g">{t['c2']}</span></p></div>
    <div class="wr">{ba(FLOOR,t,178,9)}</div>
  </div>
  <div class="wbar">{loc(17)}<p class="url" style="font-size:18px;margin-left:auto">magicstickclean.ca</p><div class="cta" style="font-size:14px;padding:8px 18px">{t['cta']}</div></div>
</div>''')
    # 6) 728x90
    out.append(f'''<div class="ad fl" id="flyer-{l}-728x90" style="width:728px;height:90px;padding:8px 12px;display:flex;flex-direction:row;align-items:center;gap:12px">
  {logo(36,12.5,21,'flex:none')}
  <div class="pill" style="font-size:38px;padding:2px 12px 4px;flex:none">{t['price']}<div class="ps" style="font-size:8.5px">{t['sub_s']}</div></div>
  <div style="flex:1;min-width:0;white-space:nowrap"><p class="claim" style="font-size:14.5px;text-align:left">{t['c1']}<br><span class="g">{t['c2']}</span></p><div style="margin-top:4px">{loc(10.5)}</div></div>
  <div class="cta" style="font-size:12px;padding:9px 13px;flex:none">{t['cta_s']}</div>
</div>''')
    return out

head = '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Google Ads flyers — Magicstick Clean</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Libre+Baskerville:wght@700&family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  /* Uploaded display ads in the style of the owner's flyer (logo, service row, gradient price, cities bar).
     Generated by gen-flyer-ads.py (edit that, then re-run it); each .ad is screenshotted at its exact size into ads/images/flyer-*.jpg.
     Real photos only (no staged team), no "cheapest" claim, prices = site prices. */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --navy: #14143a; --grad: linear-gradient(100deg, #2f7ff0 0%, #5b5cf0 50%, #8a3ff0 100%); }
  body { font-family: Inter, sans-serif; background: #ccc; display: flex; flex-wrap: wrap; gap: 30px; padding: 30px; align-items: flex-start; }
  .ad { position: relative; overflow: hidden; flex: none; }
  .fl { background: radial-gradient(120% 70% at 50% 0%, #f3f1ff 0%, #fff 70%); color: var(--navy); border: 1px solid #d9d9ec; display: flex; flex-direction: column; }
  .fl > * { position: relative; z-index: 1; }
  .fl > .scene { position: absolute; left: 0; right: 0; bottom: 0; z-index: 0; -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.55) 100%); mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.55) 100%); }
  .scene img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .g { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mark { display: block; flex: none; }
  .logo { display: flex; align-items: center; gap: .35em; }
  .m { font-family: "Libre Baskerville", serif; font-weight: 700; color: var(--navy); line-height: 1; letter-spacing: .01em; }
  .c { font-weight: 900; letter-spacing: -0.035em; line-height: .92; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .tag { text-align: center; letter-spacing: .28em; text-transform: uppercase; font-weight: 600; }
  .cats { display: flex; justify-content: center; margin-top: 6px; }
  .cats span { font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.15; display: flex; align-items: center; }
  .cats span + span { border-left: 1.5px solid #6a5cf0; }
  .vcats { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .vcats span { font-weight: 800; text-transform: uppercase; }
  .pill { background: var(--grad); color: #fff; font-family: Anton, Impact, sans-serif; border-radius: .26em; text-align: center; line-height: 1; box-shadow: 0 6px 18px rgba(91,92,240,.28); }
  .pill small { font-size: .44em; }
  .pill .ps { font-family: Inter, sans-serif; font-weight: 700; margin-top: 1px; letter-spacing: 0; }
  .claim { font-family: Anton, Impact, sans-serif; text-transform: uppercase; text-align: center; line-height: 1.08; letter-spacing: .01em; }
  .loc { display: flex; align-items: center; justify-content: center; gap: .45em; font-weight: 900; text-transform: uppercase; }
  .loc i { width: 1.5px; height: 1em; background: #6a5cf0; }
  .loc.stack { flex-direction: column; gap: 1px; }
  .loc.stack svg { margin-bottom: 2px; }
  .cta { background: var(--navy); color: #fff; font-weight: 800; border-radius: 999px; text-align: center; white-space: nowrap; }
  .url { font-family: Anton, Impact, sans-serif; text-transform: uppercase; text-align: center; letter-spacing: .02em; }
  .bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ba { display: grid; gap: 4px; margin-top: 9px; border-radius: 10px; overflow: hidden; }
  .ba figure { position: relative; overflow: hidden; }
  .ba img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ba figcaption { position: absolute; top: 5px; left: 5px; background: rgba(20,20,58,.85); color: #fff; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; border-radius: 999px; padding: 2px 7px; }
  .wide { display: grid; grid-template-columns: 300px 1fr 300px; align-items: center; gap: 16px; padding: 14px 16px 0; height: 204px; }
  .wr .ba { margin-top: 0; }
  .wbar { height: 46px; display: flex; align-items: center; gap: 18px; padding: 0 16px; border-top: 1px solid #e3e1f5; background: rgba(255,255,255,.75); }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2f7ff0"/><stop offset="1" stop-color="#8a3ff0"/></linearGradient>
    <symbol id="mark" viewBox="0 0 130 110">
      <path d="M14 62 L44 92 L104 26" fill="none" stroke="url(#g)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M108 2 L112.5 15.5 L126 20 L112.5 24.5 L108 38 L103.5 24.5 L90 20 L103.5 15.5 Z" fill="#8a3ff0"/>
    </symbol>
  </defs>
</svg>
'''
body = '\n\n'.join(a for l in ('fr','en') for a in ads(l, T[l]))
import os
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flyer-ads.html'),'w',encoding='utf-8').write(head + body + '\n</body>\n</html>\n')
