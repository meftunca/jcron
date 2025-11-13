# JCRON Syntax'ında Olan Ama Go Port'unda Eksik Olan Özellikler

## Giriş

Bu dokümanda, JCRON'un genel syntax'ında tanımlanan ama Go port'unda henüz implement edilmemiş olan özellikler detaylıca incelenmiştir. JCRON V2 Clean Architecture'a göre, bazı özellikler SQL-ports'ta mevcutken Go port'unda eksiktir.

**Tarih:** 24 Ekim 2025  
**Versiyon:** Go Port v4.2.0, JCRON V2 Syntax

## Eksik Özellikler Kategorileri

### 🚨 Kritik Eksiklikler (High Priority)

#### 1. Multi-Pattern Support (Alternative Patterns)
**JCRON Syntax'ta Mevcut:** `'0 0 0 L * * * EOD:E1D | 0 0 0 L 3,6,9,12 * *'`

**Açıklama:** Pipe (`|`) operatörü ile birden fazla alternatif pattern tanımlama.

**SQL-Ports'ta:** ✅ Tam destekli
**Go Port'unda:** ❌ Yok

**Etki:** Complex business logic için gerekli (örneğin: ay sonu veya çeyrek sonu).

#### 2. 4-Parameter Clean API Design
**JCRON V2 Syntax'ta Mevcut:**
```sql
next_time(pattern, modifier, base_time, target_tz)
```

**Açıklama:** Pattern, modifier, base time ve timezone'ı ayrı parametreler olarak alma.

**SQL-Ports'ta:** ✅ next_time() ile benzer yaklaşım
**Go Port'unda:** ❌ String parsing ile TZ: ve EOD: prefix'leri

**Etki:** API clarity ve extensibility eksikliği.

#### 3. Dedicated Wrapper Functions
**JCRON V2 Syntax'ta Mevcut:**
```sql
jcron.next_end(pattern)     -- Next + end calculation
jcron.next_start(pattern)   -- Next + start calculation
jcron.prev_end(pattern)     -- Previous + end calculation
jcron.prev_start(pattern)   -- Previous + start calculation
jcron.get_duration(pattern, from_time) -- Duration calculation
```

**SQL-Ports'ta:** ✅ FEATURE_SUMMARY.md'de eklendi
**Go Port'unda:** ❌ Yok, sadece unified NextTime()

**Etki:** Developer experience ve code readability azalması.

### ⚠️ Önemli Eksiklikler (Medium Priority)

#### 4. Full Sequential Modifier Processing (V2 Logic)
**JCRON V2 Syntax'ta Mevcut:** `E1M2W3D = Base → +1 Month End → +2 Week End → +3 Day End`

**Açıklama:** Complex sequential processing with left-to-right application.

**SQL-Ports'ta:** ✅ Temel destek
**Go Port'unda:** ⚠️ Partial (basit sequential var, ama V2 full logic eksik)

**Etki:** Advanced time calculations'da limitations.

#### 5. WOY Multi-Year Enhanced Logic
**JCRON V2 Syntax'ta Mevcut:** Multi-year search for WOY patterns (örneğin WOY:53 future year search)

**SQL-Ports'ta:** ✅ Enhanced validation ve multi-year search
**Go Port'unda:** ⚠️ Basic WOY support, multi-year logic eksik

**Etki:** Year boundary WOY patterns'da hatalar.

#### 6. Quarter-Based Modifiers
**JCRON Syntax'ta Mevcut:** `E0Q`, `S1Q` (End/Start of Quarter)

**SQL-Ports'ta:** ❌ Belirgin değil
**Go Port'unda:** ⚠️ ReferenceQuarter enum var ama kullanılmıyor

**Etki:** Quarterly scheduling için eksik.

### 📋 Minor Eksiklikler (Low Priority)

#### 7. Event-Based Termination
**JCRON Syntax'ta Mevcut:** `E[event_deadline]` gibi event-based termination.

**SQL-Ports'ta:** ❌ Yok
**Go Port'unda:** ❌ Yok

**Etki:** Advanced scheduling scenarios için limitation.

#### 8. Enhanced Timezone Handling
**JCRON V2 Syntax'ta Mevcut:** UTC offset format (`TZ:+03:00`, `TZ:-05:00`)

**SQL-Ports'ta:** ✅ Destekli
**Go Port'unda:** ⚠️ Sadece IANA names

**Etki:** Simple timezone specs için inconvenience.

## Detaylı Karşılaştırma

### Özellik Matrisi

| Özellik | JCRON V2 Syntax | SQL-Ports | Go Port | Durum |
|---------|----------------|-----------|---------|-------|
| **Multi-Pattern ( \| )** | ✅ | ✅ | ❌ | **Kritik Eksik** |
| **4-Parameter API** | ✅ | ✅ | ❌ | **Kritik Eksik** |
| **Wrapper Functions** | ✅ | ✅ | ❌ | **Kritik Eksik** |
| **Sequential Modifiers** | ✅ | ✅ | ⚠️ Partial | **İyileştirme Gerekli** |
| **WOY Multi-Year** | ✅ | ✅ | ⚠️ Basic | **İyileştirme Gerekli** |
| **Quarter Modifiers** | ✅ | ❌ | ⚠️ Enum var | **Minor** |
| **Event-Based** | ✅ | ❌ | ❌ | **Minor** |
| **UTC Offset TZ** | ✅ | ✅ | ❌ | **Minor** |

### Kod Örnekleri

#### Multi-Pattern (Go'da Yok)
```sql
-- SQL-Ports (çalışır)
SELECT jcron.next_time('0 0 0 L * * | 0 0 0 L 3,6,9,12 * *', NOW());

-- Go'da şu anki workaround (manuel)
patterns := []string{"0 0 0 L * *", "0 0 0 L 3,6,9,12 * *"}
// Manuel iteration gerekli
```

#### 4-Parameter API (Go'da Yok)
```sql
-- JCRON V2 ideal
SELECT jcron.next_time('0 0 9 * * *', 'E1W', NOW(), 'UTC');

-- Go'da şu anki
schedule, _ := jcron.FromCronSyntax("0 0 9 * * * EOD:E1W TZ:UTC")
nextTime, _ := engine.NextTime(schedule, time.Now())
```

#### Wrapper Functions (Go'da Yok)
```sql
-- SQL-Ports
SELECT jcron.next_end('0 0 9 * * *');    -- Next 9AM + end of day
SELECT jcron.get_duration('0 0 9 * * * E1D', NOW());

-- Go'da şu anki (manual calculation gerekli)
```

## Implementation Önerileri

### Phase 1: Kritik Özellikler (High Priority)
1. **Multi-Pattern Support**: Parser'a `|` operator desteği ekle
2. **4-Parameter API**: Yeni function signatures ekle
3. **Wrapper Functions**: next_end, next_start, get_duration implement et

### Phase 2: Enhanced Logic (Medium Priority)
1. **Full Sequential Processing**: V2 logic'e göre güncelle
2. **WOY Multi-Year**: Future year search implement et
3. **Quarter Support**: E0Q, S1Q gibi patterns ekle

### Phase 3: Minor Enhancements (Low Priority)
1. **Event-Based Termination**: E[event] syntax desteği
2. **UTC Offset Timezones**: TZ:+03:00 format desteği

## Test Cases

### Multi-Pattern Test
```sql
-- Beklenen davranış: İki pattern'den ilk match olanı döndür
SELECT jcron.next_time('0 0 9 * * 1 | 0 0 10 * * 1', '2024-01-01 08:00:00');
-- Monday ise 09:00, değilse 10:00
```

### Sequential Modifier Test
```sql
-- E1M2W3D: +1 ay sonu, +2 hafta sonu, +3 gün sonu
SELECT jcron.next_time('E1M2W3D', '2024-01-15 10:00:00');
-- Expected: Complex calculation result
```

## Sonuç

Go port'u güçlü bir foundation'a sahip olsa da, JCRON V2 Clean Architecture'ın bazı kritik özellikleri eksiktir. Özellikle multi-pattern support ve clean API design, Go port'unun JCRON ecosystem'inde full compatibility sağlaması için gereklidir.

**Öncelik Sırası:**
1. **Multi-Pattern Support** - Business logic için kritik
2. **4-Parameter API** - Developer experience için kritik  
3. **Wrapper Functions** - Code readability için önemli
4. **Enhanced Sequential Logic** - Advanced calculations için gerekli

Bu eksikliklerin giderilmesi, Go port'unun JCRON V2 standardına tam uyumlu hale gelmesini sağlayacaktır.</content>
<parameter name="filePath">/Users/mapletechnologies/go-workspace/src/github.com/meftunca/jcron/missing_features_go_port.md