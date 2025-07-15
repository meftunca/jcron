// dist dizinine package.json'u taşı ve bu dizini publish et

const fs = require("fs");
const path = require("path");
const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = require(packageJsonPath);
const distPath = path.join(__dirname, "dist");
const distPackageJsonPath = path.join(distPath, "package.json");

// package.json dosyasını dist dizinine kopyala
fs.copyFileSync(packageJsonPath, distPackageJsonPath);
// dist dizindeki package.json'u güncelle, içindeki tüm dosyaları dahil et
// dosyaları oku
const files = fs.readdirSync(distPath).filter(file => file !== "package.json");
packageJson.files = files;
// main ve types alanlarını dist dizinine göre güncelle
packageJson.main = "index.js";
packageJson.types = "index.d.ts";
// dist dizinindeki package.json'u güncelle
fs.writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 2));

// publish komutunu çalıştır
const { execSync } = require("child_process");
try {
  execSync("npm publish --access public", { cwd: distPath, stdio: "inherit" });
  console.log("Package published successfully.");
} catch (error) {
  console.error("Failed to publish package:", error.message);
}
