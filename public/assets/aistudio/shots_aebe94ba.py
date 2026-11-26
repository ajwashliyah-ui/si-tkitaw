import sys, pathlib, base64
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); url = (pathlib.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
vend = pathlib.Path('/opt/npm-tools/node_modules/@zenuml/core/dist/vendor/tailwindcss/tailwindcss.js')
foto = out/'foto.png'
from PIL import Image; Image.new('RGB',(1600,1200),(120,180,120)).save(foto)
errors=[]
with sync_playwright() as p:
    b = p.chromium.launch()
    for nama,w,h,touch in [('hp',390,844,True),('tab',820,1180,True),('pc',1440,900,False)]:
        c=b.new_context(viewport={'width':w,'height':h},has_touch=touch)
        c.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        g=c.new_page(); g.on('pageerror', lambda e: errors.append(str(e)))
        g.goto(url); g.wait_for_selector('.sampul'); g.wait_for_timeout(1800)
        def shot(n):
            over=g.evaluate('document.documentElement.scrollWidth-innerWidth')
            if over>0: errors.append(f'{nama}-{n} overflow {over}')
            g.screenshot(path=out/f'{nama}-{n}.png')
        def wait(): g.wait_for_selector('#memuat',state='hidden'); g.wait_for_timeout(600)
        shot('1sampul')
        for i in (3,6):
            g.evaluate(f"(()=>{{const s=document.querySelector('.sehari');scrollTo(0,s.offsetTop+(s.offsetHeight-innerHeight)*{(i+.5)/7})}})()"); g.wait_for_timeout(1000); shot(f'2hari{i}')
        def masuk(u):
            g.click('.atas [data-masuk]'); g.click(f'[data-u="{u}"]'); g.wait_for_selector('.menu'); wait()
        def hal(x): g.click(f'[data-hal="{x}"]'); wait()
        def keluar(): g.click('#b-keluar'); g.wait_for_selector('.sampul')
        g.evaluate('scrollTo(0,0)'); masuk('ortu.zahra'); shot('3ortu'); hal('kaih')
        g.set_input_files('#f-foto',str(foto)); g.wait_for_selector('#pratinjau:not([hidden])'); g.click('#f-kaih button.tbl'); wait()
        if not g.locator('#pratinjau').get_attribute('src').startswith('data:image/jpeg'): errors.append('foto gagal')
        shot('4kaih'); hal('tumbuh'); shot('5tumbuh'); keluar()
        masuk('guru.b'); hal('baca'); g.select_option('[name=track_level_dipilih]','TRACK_3'); g.click('#f-lit button.tbl'); wait(); shot('6guru')
        hal('agama'); g.click('#f-agama button.tbl'); wait(); hal('ulasan'); g.fill('[name=isi_pesan]','<img src=x onerror=alert(1)>'); g.click('#f-ulasan button.tbl'); wait()
        if g.locator('.obrolan img').count(): errors.append('xss')
        keluar(); masuk('admin'); shot('7rekap'); hal('akun'); g.click('[data-tambah=user]'); shot('8form'); g.click('[data-tutup]')
        for x in ('siswa','master','atur'): hal(x); 
        shot('9atur')
        if nama=='pc':
            keluar(); masuk('ortu.zahra'); g.evaluate('window.print=()=>{}'); g.click('#b-cetak'); g.wait_for_timeout(500); g.pdf(path=str(out/'rapor.pdf'),format='A4')
        c.close()
    b.close()
print(errors or 'tanpa error')
