# JCron EOD (End of Duration) - Quick Reference

🚀 **JCron Go library** artık **End of Duration (EOD)** özelliği ile birlikte geliyor! Bu özellik, cron schedule'larının ne kadar süreyle çalışacağını belirlemenizi sağlar.

## ⚡ Hızlı Başlangıç

```go
import "github.com/meftunca/jcron"

// Hafta içi 9 AM'de başlayıp 8 saat çalışan schedule
schedule, err := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")
if err != nil {
    panic(err)
}

// Session ne zaman bitiyor?
endTime := schedule.EndOfFromNow()
fmt.Printf("Current session ends: %s\n", endTime.Format("15:04"))
```

## 📋 Temel EOD Formatları

| Format | Açıklama | Örnek Senaryo |
|--------|----------|---------------|
| `E8H` | 8 saat sürer | Normal iş günü |
| `S30M` | 30 dakika sürer | Kısa toplantı |
| `E2DT4H` | 2 gün 4 saat sürer | Uzun proje |
| `D` | Günün sonuna kadar | Günlük görevler |
| `M` | Ayın sonuna kadar | Aylık raporlar |
| `E1H W` | 1 saat, hafta sonuna kadar | Haftalık bakım |

## 🎯 Kullanım Senaryoları

### 1. İş Saatleri
```go
// Pazartesi-Cuma 9-17 arası çalışma
schedule, _ := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")
```

### 2. Toplantı Planları
```go
// Her Pazartesi 14:00'de 1.5 saatlik toplantı
schedule, _ := jcron.FromCronSyntax("0 14 * * 1 EOD:E1HT30M")
```

### 3. Aylık Görevler
```go
// Her ayın 1'inde başlayıp ay sonuna kadar süren görev
schedule, _ := jcron.FromCronSyntax("0 0 1 * * EOD:M")
```

### 4. Event-Based Termination
```go
// Proje deadline'ına kadar çalışan task
schedule, _ := jcron.FromCronSyntax("*/15 9-17 * * 1-5 EOD:E[project_end]")
```

## 🛠️ Helper Functions

```go
// Önceden tanımlı EOD pattern'leri
eod := jcron.EODHelpers.EndOfDay(0, 0, 0)     // Günün sonuna kadar
eod := jcron.EODHelpers.EndOfWeek(1, 2, 0)    // Hafta sonuna kadar -1 gün -2 saat
eod := jcron.EODHelpers.EndOfMonth(5, 0, 0)   // Ay sonuna kadar -5 gün
eod := jcron.EODHelpers.UntilEvent("sprint_end", 2, 0, 0) // Event'e kadar -2 saat
```

## 🔍 Schedule Metodları

```go
schedule, _ := jcron.FromCronSyntax("0 9 * * 1-5 EOD:E8H")

// EOD kontrolü
if schedule.HasEOD() {
    fmt.Println("Schedule has end duration configured")
}

// Bitiş zamanı hesaplama
endTime := schedule.EndOf(time.Now())
fmt.Printf("Ends at: %s\n", endTime.Format("15:04:05"))

// JCron format'ına çevirme
jcronStr := schedule.ToJCronString()
fmt.Printf("JCron format: %s\n", jcronStr)
```

## 📊 Format Reference

### Referans Noktaları
- `S` = Start (Başlangıçtan itibaren)
- `E` = End (Bitişten itibaren)
- `D` = Day (Günün sonuna kadar)
- `W` = Week (Haftanın sonuna kadar)
- `M` = Month (Ayın sonuna kadar)
- `Q` = Quarter (Çeyreğin sonuna kadar)
- `Y` = Year (Yılın sonuna kadar)

### Time Units
- `S` = Seconds (Saniye)
- `M` = Minutes (Dakika)
- `H` = Hours (Saat)
- `D` = Days (Gün)
- `W` = Weeks (Hafta)
- `M` = Months (Ay)*
- `Y` = Years (Yıl)

*Ay (M) hem dakika hem de ay anlamında kullanılabilir, context'e göre belirlenir.

### Karmaşık Formatlar (ISO 8601 Benzeri)
- `E2DT4H` = 2 gün 4 saat (T ile ayrılır)
- `S1Y6M3D` = 1 yıl 6 ay 3 gün
- `E1DT12H30M` = 1 gün 12 saat 30 dakika

## ✅ Validation

```go
// EOD string'i geçerli mi?
isValid := jcron.IsValidEoD("E8H")           // true
isValid := jcron.IsValidEoD("INVALID")       // false

// Parse etmeyi dene
eod, err := jcron.ParseEoD("E2DT4H")
if err != nil {
    fmt.Printf("Parse error: %v\n", err)
}
```

## 🚀 Advanced Usage

### Multiple Extensions
```go
// WOY (Week of Year), TZ (Timezone), EOD kombinasyonu
schedule, err := jcron.FromJCronString("0 30 14 * * 1-5 WOY:1-26 TZ:UTC EOD:E45M")
```

### Programmatic Creation
```go
eod := jcron.NewEndOfDuration(0, 0, 0, 2, 4, 0, 0, jcron.ReferenceEnd) // 2 gün 4 saat
schedule := &jcron.Schedule{
    Hour:      jcron.StrPtr("9"),
    DayOfWeek: jcron.StrPtr("MON-FRI"),
    EOD:       eod,
}
```

## 📚 Documentation

Detaylı dokümantasyon için: [EOD_INTEGRATION.md](./EOD_INTEGRATION.md)

## ✨ Özellikler

- ✅ **Backward Compatible**: Mevcut kod değişmeden çalışır
- ✅ **Flexible Formats**: Basit'ten karmaşığa tüm formatları destekler
- ✅ **Helper Functions**: Yaygın senaryolar için hazır fonksiyonlar
- ✅ **Event-Based**: Event'lere dayalı sonlandırma
- ✅ **Full Test Coverage**: Kapsamlı test coverage'ı
- ✅ **Performance Optimized**: Yüksek performans

## 🤝 Katkıda Bulunma

EOD özelliği geliştirmesi devam ediyor. Katkılarınızı bekliyoruz!

---

**⭐ JCron EOD ile schedule'larınızı daha güçlü ve esnek hale getirin!**
