
document.getElementById("useCurrentSubject").addEventListener("change", function () {
  document.getElementById("customSubjectGroup").style.display = this.checked ? "none" : "block";
});

document.getElementById("logo").addEventListener("change", function (e) {
  const preview = document.getElementById("logoPreview");
  const file = e.target.files[0];
  preview.src = file ? URL.createObjectURL(file) : "";
});

document.getElementById("product").addEventListener("change", function (e) {
  const preview = document.getElementById("productPreview");
  const file = e.target.files[0];
  preview.src = file ? URL.createObjectURL(file) : "";
});
