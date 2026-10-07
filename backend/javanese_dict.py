"""Kamus kata bahasa Jawa (ngoko & krama) untuk validasi hasil transliterasi."""

WORDS = frozenset("""
lurah tunjung mungguh sugeng rawuh matur nuwun mangan ngombe turu mlaku omah
banyu sego iwak pitik sapi wedhus kembang wit godhong srengenge rembulan lintang
udan angin lemah watu geni langit bumi bocah wong ibu bapak anak sedulur kanca
tangga pasar dalan motor mobil sekolah buku potlot meja kursi lawang jendela
klambi katok sepatu topi jam dhuwit rega murah larang anyar lawas gedhe cilik
dawa cendhak abot entheng cepet alon adoh cedhak nduwur ngisor ngarep mburi kiwa
tengen esuk awan sore bengi dino wulan taun senen selasa rebo kemis jemuah setu
minggu kulo sampean panjenengan dalem aku kowe dheweke iki iku kae sing lan ora
iya dudu wes durung lagi arep iso ora bisa gelem emoh seneng susah becik ala
pinter bodho sugih mlarat rame sepi resik reged padhang peteng anget adem panas
adhem legi pait pedhes asin gurih mambu wangi bacin krungu deleng ndelok maca
nulis ngomong crito takon jawab tuku adol gawe rusak dandan resik umbah masak
tandur panen mangan wareg luwe ngelak kesel sehat lara mati urip lair tuwa enom
Lanang wadon bagus ayu elek apik olo temen salah bener leres lepat agung asor
duwur endhek jero cethek amba ciut kandel tipis atos empuk garing teles teles
kebak suwung wutuh tugel pedhot sambung pisah kumpul lunga teka bali muleh
mlebu metu munggah mudhun mlaku mlayu mabur nglangi njagong ngadeg lungguh
turu tangi melek merem ngguyu nangis nesu sabar wedi wani isin gumun kaget
eling lali ngerti paham mikir ngrasakake tresna sayang sengit gething kangen
kangen pengen butuh cukup kurang luwih akeh sitik kabeh kabeh saben saben
nalika nalika yen yen nek menawa supaya amarga jalaran senajan sanadyan
nanging ning lan ugo sarta karo tanpa margo saka menyang ing neng ndhuwur
ngisor ngarep mburi sandhing cedhak adoh njero njaba kiwa tengen tengah pinggir
pucuk bongkot oyot pang uwit uwoh kembang godhong pang pucuk suket alang alang
pari jagung tela ketela kacang bawang brambang lombok uyah gula teh kopi susu
es wedang ronde dawet cendhol klepon gethuk tiwul gaplek growol nasi liwet
rawon soto gudeg pecel lotek rujak sate bakso mie soto ayam goreng bakar rebus
kukus panggang asin manis asem sepet getir sedhep nikmat enak ora enak wareg
kembung mules mencret watuk pilek panas dingin greges kesel sayah ngantuk
pegel linu abuh bengkak tatu perih lara ati mumet ngelu sirah untu mripat
kuping irung cangkem lambe ilat gulu pundhak dhadha weteng geger bokong pupu
dhengkul sikil tangan driji kuku kulit balung getih daging gajih otot urat
rambut brewok jenggot kumis alis idep pipi bathuk dagu jakun tenggorokan paru
jantung ginjel ati limpa usus weteng puser susu pentil pusar dubur zakar bawok
turuk meri perawan jaka duda randa manten penganten mantenan sunat tetak
baptis slametan kenduri tahlilan yasinan mitoni tedhak siten ngupati tingkeban
lahiran kematian kubur makam nisan layon jenazah ruh nyawa suwarga neraka
gusti allah pangeran dewa dewi malaikat setan demit lelembut tuyul pocong
kuntilanak genderuwo wewe gombel banaspati jelangkung santet tenung pelet
guna guna jimat keris tombak pedang tameng panah bedhil meriam benteng prajurit
tentara polisi maling rampok begal copet jambret garong bajingan brengsek
bajingan kurang ajar saru jorok misuh ngamuk nesu muring muring nggrundel
ngedumel cangkem elek lambe turah kakean omong ember bocor rahasia wadi
konangan kecekel keno ukum penjara bui LP rutan kejaksaan pengadilan hakim
jaksa pengacara notaris lurah camat bupati walikota gubernur presiden menteri
dpr mpr dprd rt rw dukuh dusun kampung desa kelurahan kecamatan kabupaten
kota provinsi negara nusantara jawa sumatra kalimantan sulawesi papua bali
lombok madura indonesia merah putih garuda pancasila uud bhineka tunggal ika
merdeka perjuangan pahlawan veteran pejuang kemerdekaan proklamasi sumpah
pemuda kongres bahasa persatuan kesatuan gotong royong musyawarah mufakat
adil makmur sejahtera sentosa tata tentrem kerta raharja gemah ripah loh
jinawi subur makmur ayem tentrem rukun agawe santosa crah agawe bubrah
reresik resik resik ala becik ketitik olo ketara sopo nandur bakal ngunduh
alon alon waton kelakon sabar sareh mesthi bakal pikoleh ojo dumeh ojo kagetan
ojo gumunan ojo adigang adigung adiguna memayu hayuning bawana ambrasta dur
hangkara sastra cetha ngesti tunggal ingkang sinuwun kanjeng gusti raden mas
ajeng den ayu ndara bendara tuwan nyonya nona tuan puan bapak ibu pak bu mas
mbak dik kang yu lek lik pakdhe budhe paklik bulik simbah eyang kakung putri
wayah buyut canggah wareng udeg udeg gantung siwur
""".split())


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    la, lb = len(a), len(b)
    if la == 0:
        return lb
    if lb == 0:
        return la
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        for j in range(1, lb + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[lb]


def suggest(word: str, max_dist: int = 2, limit: int = 3) -> list:
    """Cari kata terdekat di kamus untuk kata yang tidak dikenal."""
    w = word.lower().strip()
    if not w or w in WORDS:
        return []
    cands = []
    for cand in WORDS:
        if abs(len(cand) - len(w)) > max_dist:
            continue
        d = levenshtein(w, cand)
        if d <= max_dist:
            cands.append((d, cand))
    cands.sort()
    return [c for _, c in cands[:limit]]
