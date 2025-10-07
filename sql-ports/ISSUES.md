# Aşama 1 — Doğruluk + hızlı kazanımlar

1. Zaman dilimi (TZ) dönüşümünü doğrult
**Sorun:** `prev_time` içinde `from_time AT TIME ZONE timezone` kullanımı `timestamptz→timestamp` yapıp DST’de yanlış mutlak ana sapabiliyor.

**Çözüm:** TZ-li cron hesaplarını *yerelde (timestamp)* yap, finalde `timezone(parsed.timezone_name, result_local_ts)` ile tekrar `timestamptz`’a dön.
**Kabul:** DST giriş/çıkış günlerinde beklenen tetik anı ±0 sn sapma.
2. Ay maskesini de doğrula
**Sorun:** `next_cron_time`/`prev_cron_time` sonunda sadece `day_mask` ve `dow_mask` kontrol ediliyor; `month_mask` yok sayılıyor.

**Çözüm:** Son doğrulamada `month_mask` bitini de AND’e ekle.
**Kabul:** Yanlış ayda eşleşme dönmez; ay kısıtlı cron’lar doğru sonuç verir.
3. Saniye alanı tutarsızlığı
**Sorun:** Üretilen sonuçların saniyesi hep `0`, ama `matches_cron_time` saniyeyi de kontrol ediyor → bazı desenler kaçabiliyor.

**Çözüm:** (a) 6 alanlı desenlerde `sec_mask` üretip uygula **veya** (b) saniye alanını resmi olarak `0` kabul ettiğini belgede belirtip `matches_cron_time`’da saniye kontrolünü bu davranışla hizala.
**Kabul:** `sec≠0` içeren desenlerde tutarlı sonuç; testlerde saniye uyuşmazlığı kalmıyor.
4. `has_special_syntax` yanlış pozitifleri azalt
**Sorun:** `pattern ~ '[L#]'` TZ gibi metinlerde de yakalayıp özel yolaklara sapabiliyor.

**Çözüm:** Önce parçala (`compile_pattern_parts`), sadece **gün** ve **hafta günü** alanlarını `L/#` için test et.
**Kabul:** `TZ[Australia/Sydney]` benzeri örnekler normal akışta kalır.
5. “Özel sözdizimi” için geri yönde destek
**Sorun:** `prev_cron_time` özel sözdiziminde exception atıyor.

**Çözüm:** `handle_special_syntax`’ın *prev* varyantını ekle (en azından `L` ve `#`).
**Kabul:** `L/#` içeren desenlerle `prev_*` çağrıları çalışır, exception atmaz.
6. Wrapper’ların volatilitesi
**Sorun:** `next/next_start/...` fonksiyonları `NOW()` kullanmasına rağmen `IMMUTABLE`. Planner cache’inde yanlış sonuç riski.

**Çözüm:** Bu wrapper’ları `STABLE` yap.
**Kabul:** `\df+ jcron.*` çıktısında ilgili fonksiyonlar `STABLE`; aynı statement içinde tutarlılık korunur.

***

# Aşama 2 — Performans iyileştirmeleri

7. Regex’i biraz daha azalt (sıcak nokta temizi)
**Sorun:** `parse_clean_pattern` hâlâ birkaç `regexp_replace` içeriyor.

**Çözüm:** Bu üç temizliği de `position()/substring()` ile karakter taramasıyla yap.
**Kabul:** Pattern başına CPU düşer; microbenchmark’ta \~%10+ hızlanma.
8. Bit arama yardımcıları satır içi/erken çıkış optimizasyonu
**Sorun:** `next_bit/prev_bit/first_bit/last_bit` doğrusal döngüler.

**Çözüm:** Döngü aralığını sıklaştır (örn. `LEAST(max,62)` zaten var), sık görülen aralıklarda erken çıkış; ileride C-extension düşünülür.
**Kabul:** Seyrek/dense maske kombinasyonlarında P95/99 dalgalanması azalır.
9. WOY’de sıçrayarak arama
**Sorun:** Uygun haftaya ulaşmak için tekrarlı denemeler var.

**Çözüm:** `parsed.woy_weeks` içinde `> current_week` **min**’e doğrudan atla; yıl taşmasında erken yıl-başı + min(w) sıçraması zaten var, bu akışı netleştir.
**Kabul:** Çok seyrek WOY listelerinde belirgin deneme sayısı düşüşü.