# Stylised map of central Almaty for the "Delivery" card (public/img/almaty-map.svg) + courier route.
# Data: OpenStreetMap (ODbL) — keep the "© OpenStreetMap" credit next to the map.
# 1) Fetch data (Overpass API, any mirror):
#    curl -s --data-urlencode data@scripts/almaty-map.overpass https://maps.mail.ru/osm/tools/overpass/api/interpreter -o /tmp/almaty.json
# 2) python3 scripts/almaty-map.py /tmp/almaty.json public/img/almaty-map.svg /tmp/route.json
#    route.json holds the route path and marker coordinates (viewBox 600x480) used in Main/Mobile .dc.html.

"""Render a stylised map of central Almaty from OpenStreetMap data (© OpenStreetMap contributors, ODbL)
into an SVG file + compute a delivery route along real streets for the overlay."""
import json, math, heapq, sys

SRC, OUT_SVG, OUT_ROUTE = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 600, 480
LAT0, LON0 = 43.2358, 76.9370
M_PER_UNIT = 2400 / W
KX = math.cos(math.radians(LAT0)) * 111320 / M_PER_UNIT
KY = 110540 / M_PER_UNIT


def proj(p):
    return ((p['lon'] - LON0) * KX + W / 2, H / 2 - (p['lat'] - LAT0) * KY)


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


PAD = 40
def visible(pts):
    return any(-PAD <= x <= W + PAD and -PAD <= y <= H + PAD for x, y in pts)


def d_of(pts, close=False):
    s = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
    return s + ('Z' if close else '')


data = json.load(open(SRC))['elements']
CLS = {
    'major': {'motorway', 'trunk', 'primary', 'secondary', 'primary_link', 'secondary_link'},
    'mid': {'tertiary', 'tertiary_link'},
    'minor': {'residential', 'unclassified', 'living_street'},
    'path': {'pedestrian', 'service'},
}
roads = {k: [] for k in CLS}
parks, water = [], []
graph = {}
named = {}
CAR = CLS['major'] | CLS['mid'] | CLS['minor']

for w in data:
    t = w.get('tags', {})
    g = w.get('geometry')
    if not g:
        continue
    pts = [proj(p) for p in g]
    if not visible(pts):
        continue
    hw = t.get('highway')
    if hw:
        for k, v in CLS.items():
            if hw in v:
                roads[k].append(rdp(pts, 0.6))
        if hw in CAR and t.get('access') not in ('private', 'no'):
            oneway = t.get('oneway') == 'yes'
            for a, b, pa in zip(w['nodes'], w['nodes'][1:], range(len(pts))):
                pb = pa + 1
                L = math.dist(pts[pa], pts[pb])
                graph.setdefault(a, {'xy': pts[pa], 'e': []})['e'].append((b, L))
                graph.setdefault(b, {'xy': pts[pb], 'e': []})
                if not oneway:
                    graph[b]['e'].append((a, L))
        nm = t.get('name:ru') or t.get('name')
        if nm and hw in CLS['major'] | CLS['mid']:
            named.setdefault(nm, []).append((pts, w['nodes'], hw))
    elif t.get('leisure') or t.get('landuse'):
        if g[0] == g[-1]:
            parks.append(rdp(pts, 0.8))
    elif t.get('waterway'):
        water.append(rdp(pts, 0.8))


# ---- route: kitchen (south-west) -> home on Abay avenue (north-east)
def nearest(x, y, pred=lambda n: True):
    best = min((n for n in graph if pred(n)), key=lambda n: math.dist(graph[n]['xy'], (x, y)))
    return best

abay = {n for pts, nodes, _ in named.get('проспект Абая', []) for n in nodes}
print('abay nodes', len(abay), [k for k in named if 'Аба' in k])
home = nearest(420, 110, lambda n: n in abay) if abay else nearest(420, 110)
main_nodes = {n for v in named.values() for _, nodes, _ in v for n in nodes}
kitchen = nearest(185, 350, lambda n: n in main_nodes)
dist = {kitchen: 0}; prev = {}; pq = [(0, kitchen)]
while pq:
    d, u = heapq.heappop(pq)
    if u == home:
        break
    if d > dist.get(u, 1e18):
        continue
    for v, L in graph[u]['e']:
        nd = d + L
        if nd < dist.get(v, 1e18):
            dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
path = [home]
while path[-1] != kitchen:
    path.append(prev[path[-1]])
path.reverse()
route = rdp([graph[n]['xy'] for n in path], 0.5)
print('route len units', round(dist[home]), 'points', len(route), 'home', graph[home]['xy'], 'kitchen', graph[kitchen]['xy'])

# ---- labels: a few main streets, placed on a long straight segment inside the safe area
labels = []
placed = []
dense = [(a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20) for a, b in zip(route, route[1:]) for k in range(21)]
WANT = ['проспект Абая', 'улица Сатпаева', 'проспект Сейфуллина', 'улица Желтоксан', 'улица Тимирязева', 'улица Байтурсынулы', 'улица Шевченко', 'улица Курмангазы', 'улица Наурызбай Батыра', 'улица Жандосова']
print('named sample', list(named)[:40])
for nm in WANT:
    best = None
    for pts, _, _ in named.get(nm, []):
        for i in range(len(pts)):
            arc = 0
            for j in range(i + 1, len(pts)):
                arc += math.dist(pts[j - 1], pts[j])
                if arc >= 64:
                    break
            if arc < 64:
                continue
            (x1, y1), (x2, y2) = pts[i], pts[j]
            if math.dist((x1, y1), (x2, y2)) < 0.985 * arc:
                continue
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            if not (70 < mx < W - 70 and 40 < my < H - 80):
                continue
            dr = min(math.dist((x1 + (x2 - x1) * k / 8, y1 + (y2 - y1) * k / 8), p) for k in range(9) for p in dense)
            if dr < 18:
                continue
            if any(math.dist((mx, my), q) < 90 for q in placed):
                continue
            if not best or dr > best[0]:
                best = (dr, mx, my, math.degrees(math.atan2(y2 - y1, x2 - x1)))
    if best:
        L, mx, my, ang = best
        if ang > 90: ang -= 180
        if ang < -90: ang += 180
        short = nm.replace('проспект ', 'пр. ').replace('улица ', 'ул. ')
        placed.append((mx, my))
        labels.append(f'<text transform="translate({mx:.1f} {my:.1f}) rotate({ang:.1f})" dy="3.2">{short}</text>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<!-- Map data © OpenStreetMap contributors (ODbL), openstreetmap.org/copyright -->
<rect width="{W}" height="{H}" fill="#EFE9E0"/>
<path d="{' '.join(d_of(p, True) for p in parks)}" fill="#DDE7CF"/>
<path d="{' '.join(d_of(p) for p in water)}" fill="none" stroke="#C9DCE3" stroke-width="3" stroke-linecap="round"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="{' '.join(d_of(p) for p in roads['minor'])}" stroke="#E2DACD" stroke-width="4.2"/>
<path d="{' '.join(d_of(p) for p in roads['mid'])}" stroke="#E2DACD" stroke-width="6.2"/>
<path d="{' '.join(d_of(p) for p in roads['major'])}" stroke="#DED4C4" stroke-width="9"/>
<path d="{' '.join(d_of(p) for p in roads['minor'])}" stroke="#FBF8F3" stroke-width="2.8"/>
<path d="{' '.join(d_of(p) for p in roads['mid'])}" stroke="#FFFFFF" stroke-width="4.6"/>
<path d="{' '.join(d_of(p) for p in roads['major'])}" stroke="#FFFFFF" stroke-width="7.2"/>
</g>
<g font-family="Montserrat, Arial, sans-serif" font-size="9" font-weight="600" fill="#9A9088" text-anchor="middle" letter-spacing=".2">
{chr(10).join(labels)}
</g>
</svg>
'''
open(OUT_SVG, 'w').write(svg)
json.dump({'route': d_of(route), 'home': graph[home]['xy'], 'kitchen': graph[kitchen]['xy']}, open(OUT_ROUTE, 'w'))
print('svg bytes', len(svg.encode()), 'labels', len(labels))
