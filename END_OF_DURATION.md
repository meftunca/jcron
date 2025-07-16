## End-of-Duration (EoD) Format Spesifikasyonu


### 1. Giriş

Bu belge, zaman aralıklarını belirli bir referans noktasından **geriye doğru** veya bir görevin/olayın **tamamlanması için kalan süreyi** ifade etmek amacıyla tasarlanmış yeni bir standartlaştırılmış format olan **End-of-Duration (EoD)** formatını tanımlamaktadır. ISO 8601 Durasyon formatı bir başlangıç noktasından itibaren geçen mutlak süreyi ifade ederken, EoD formatı belirli bir hedef veya bitiş noktasına göre bir zaman aralığını vurgular.

### 2. Formatın Yapısı

EoD formatı, temel olarak üç ana bileşenden oluşur ve aşağıdaki genel yapıya sahiptir:

`E[N_Units][R_Point]`

- **`E`&#32;(End):** Formatın başlangıcını ve "End-of-Duration" anlamını belirtir. Sabit bir karakterdir.
- **`[N_Units]`&#32;(Sayısal Birimler):** Sürenin miktarını ifade eden sayı ve zaman birimi çiftlerinden oluşan bir bölümdür. ISO 8601 Durasyon formatına benzer bir yapıyı takip eder.
- **`[R_Point]`&#32;(Referans Noktası):** Bu sürenin hangi belirgin zaman noktasına göre sona erdiğini veya tamamlandığını belirten opsiyonel bir bileşendir.

### 3. Bileşenlerin Detaylı Tanımı


#### 3.1. `E` - Başlangıç Belirteci

- Format her zaman büyük harf `E` ile başlar.
- `E`, "End-of-Duration" veya "Estimated End" (Tahmini Bitiş) anlamını taşır ve ifade edilen sürenin bir geri sayım veya tamamlama hedefi olduğunu gösterir.

#### 3.2. `[N_Units]` - Sayısal Birimler

Bu kısım, **geçen süre miktarını** ifade eder ve aşağıdaki formatlara sahip sayı ve harf çiftlerinden oluşur. Her birim, kendisinden önce gelen tamsayı veya ondalık sayı ile belirtilir. Birimler, **en büyükten en küçüğe** doğru sıralanmalıdır.

- `Y`: Yıl (Years)
- `M`: Ay (Months)
- `W`: Hafta (Weeks)
- `D`: Gün (Days)
- `T`: **Zaman Ayırıcısı** (Time Designator). Gün (D) ile saat (H), dakika (M) ve saniye (S) arasındaki ayırıcıdır. Eğer saat, dakika veya saniye birimleri varsa, `T` zorunludur.
- `H`: Saat (Hours)
- `M`: Dakika (Minutes) (Bu, aylar için kullanılan `M` ile karışabilir, `T` ayırıcı bu karışıklığı önler.)
- `S`: Saniye (Seconds)

**Kurallar:**

- En az bir sayısal birim (`Y`, `M`, `W`, `D`, `H`, `M`, `S`) bulunmalıdır.
- Sayısal birimler, `P` öneki olmadan doğrudan `E` harfinden sonra gelir.
- Sıfır değerli birimler atlanabilir (örneğin `E1D` yerine `E1DT0H`).
- Birimler arasındaki sıra önemlidir (Y > M > W > D, sonra T, sonra H > M > S).

**Örnekler:**

- `E2Y`: 2 yıl (içinde tamamlanacak)
- `E3M`: 3 ay (içinde tamamlanacak)
- `E1W5D`: 1 hafta 5 gün (içinde tamamlanacak)
- `ET1H30M`: 1 saat 30 dakika (içinde tamamlanacak)
- `E1DT12H`: 1 gün 12 saat (içinde tamamlanacak)

#### 3.3. `[R_Point]` - Referans Noktası (Opsiyonel)

Bu kısım, belirtilen sürenin hangi mantıksal veya takvimsel dönemin sonunda tamamlanması gerektiğini ifade eder. `[N_Units]` kısmından sonra, bir boşlukla ayrılarak veya doğrudan bitişik olarak gelebilir (önerilen: boşlukla ayırmak).

- `D`: **Günün Sonu** (End of Day). Sürenin, mevcut takvim gününün sonuna (örneğin 23:59:59) kadar geçerli olduğunu belirtir.
- `W`: **Haftanın Sonu** (End of Week). Sürenin, içinde bulunulan takvim haftasının sonuna kadar geçerli olduğunu belirtir (genellikle Pazar gecesi).
- `M`: **Ayın Sonu** (End of Month). Sürenin, içinde bulunulan takvim ayının son gününün sonuna kadar geçerli olduğunu belirtir.
- `Q`: **Çeyreğin Sonu** (End of Quarter). Sürenin, içinde bulunulan mali veya takvim çeyreğinin son gününün sonuna kadar geçerli olduğunu belirtir.
- `Y`: **Yılın Sonu** (End of Year). Sürenin, içinde bulunulan takvim yılının son gününün sonuna kadar geçerli olduğunu belirtir.
- `E[Identifier]`: **Olay Sonu** (End of Event). Belirli bir olayın veya sürecin bitimine atıfta bulunur. `[Identifier]`, olayı benzersiz şekilde tanımlayan bir string veya sayı olabilir (örneğin bir event ID, bir process adı). Bu durumda `[N_Units]` bu olayın bitimine kalan süreyi ifade eder.
    - Örnek: `E1H E[meeting_id_123]` (Toplantı 123'ün bitiminden 1 saat sonra)

**Kurallar:**

- Eğer `[R_Point]` belirtilmezse, varsayılan referans noktası genellikle **geçerli operasyonun hemen sonu** veya **bağlam tarafından belirlenen bir varsayılan** olarak kabul edilir (örneğin, gün sonu). Spesifikasyonda bu varsayılanın ne olacağı açıkça belirtilmelidir. Bu belgede, açıkça belirtilmediğinde **"günün sonu"** varsayılabilir.
- `[R_Point]` sadece bir tane olabilir.

### 4. Örnekler

| EoD Formatı | Açıklama |
| `E5D` | Günün sonuna kadar 5 gün içinde (veya 5 gün sonunda günün sonu) |
| `E2W` | Haftanın sonuna kadar 2 hafta içinde (veya 2 hafta sonunda haftanın sonu) |
| `E1M D` | Ayın sonuna kadar 1 ay içinde, ancak her günün sonu referans alınarak (biraz kafa karıştırıcı, genelde E1M tercih edilir) |
| `ET30M` | Günün sonuna kadar 30 dakika içinde |
| `E1DT10H W` | Haftanın sonuna kadar 1 gün 10 saat içinde |
| `E1H E[task_completion]` | `task_completion` olayının bitiminden 1 saat sonra |

E-Tablolar'a aktar

### 5. Yorumlama ve Uygulama

EoD formatının yorumlanması, kullanıldığı sistem veya uygulamanın bağlamına bağlı olacaktır.

- **Geri Sayım:** Bir sayaçta gösterilecek kalan süre.
- **Hedef Tamamlama:** Bir görevin veya işlemin tamamlanması gereken maksimum süre.

Bu spesifikasyon, ISO 8601'in ruhuna uygun, okunabilir ve makine tarafından ayrıştırılabilir bir "End-of-Duration" kavramını ifade etmeyi amaçlamaktadır.