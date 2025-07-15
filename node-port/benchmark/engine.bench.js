// benchmark/engine.bench.js

import Benchmark from 'benchmark';
import { Engine } from '../dist/engine.js';
import { fromCronSyntax, Schedule } from '../dist/schedule.js'; // Schedule'ı da import edelim

console.log("JCRON Engine Benchmark Testi Başlatılıyor...");
console.log("============================================");

const suite = new Benchmark.Suite;

const engine = new Engine();
const fromTime = new Date();

// Test edilecek farklı zamanlama kuralları
const schedules = {
  simple: fromCronSyntax('* * * * * *'),
  // HATA BURADAYDI: "MON-FRI" yerine sayısal karşılığı olan "1-5" kullanıldı.
  complex: fromCronSyntax('0 5,15,25,35,45,55 8-17 ? * 1-5'),
  // Schedule nesnesini doğrudan oluşturarak Vixie OR mantığını test edelim
  withSpecialChars: new Schedule('0', '0', '12', 'L', '*', '5#3', null, 'UTC'),
  withTimezone: new Schedule('0', '30', '9', null, null, '1-5', null, 'America/New_York'),
};

suite
  .add('Engine.next() - Basit Kural (* * * * * *)', () => {
    engine.next(schedules.simple, fromTime);
  })
  .add('Engine.next() - Karmaşık Kural (İş Saatleri)', () => {
    engine.next(schedules.complex, fromTime);
  })
  .add('Engine.next() - Özel Karakterli Kural (L, #)', () => {
    engine.next(schedules.withSpecialChars, fromTime);
  })
  .add('Engine.next() - Zaman Dilimli Kural (NY)', () => {
    engine.next(schedules.withTimezone, fromTime);
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log("--------------------------------------------");
    console.log('En Hızlı Olan: ' + this.filter('fastest').map('name'));
    console.log("============================================");
  })
  .run({ 'async': true });