// Daftar perusahaan (PIC) & kredensial login internal.
// Password user tidak ditampilkan di UI — dipakai otomatis saat pilih dropdown.

window.App = window.App || {};

window.App.users = {
  ADMIN_EMAIL: "admin@sigap.com",
  ADMIN_PIN: "152114",
  DEMO_PASSWORD: "sigap-demo-2024",

  companies: [
    { id: "pt-01", name: "PT.Dummy 01", email: "pt-dummy-01@sigap.com" },
    { id: "pt-02", name: "PT.Dummy 02", email: "pt-dummy-02@sigap.com" },
    { id: "pt-03", name: "PT.Dummy 03", email: "pt-dummy-03@sigap.com" },
    { id: "pt-04", name: "PT.Dummy 04", email: "pt-dummy-04@sigap.com" },
    { id: "pt-05", name: "PT.Dummy 05", email: "pt-dummy-05@sigap.com" },
    { id: "pt-06", name: "PT.Dummy 06", email: "pt-dummy-06@sigap.com" },
    { id: "pt-07", name: "PT.Dummy 07", email: "pt-dummy-07@sigap.com" },
    { id: "pt-08", name: "PT.Dummy 08", email: "pt-dummy-08@sigap.com" },
    { id: "pt-09", name: "PT.Dummy 09", email: "pt-dummy-09@sigap.com" },
    { id: "pt-10", name: "PT.Dummy 10", email: "pt-dummy-10@sigap.com" },
    { id: "pt-11", name: "PT.Dummy 11", email: "pt-dummy-11@sigap.com" },
  ],

  getCompanyByEmail(email) {
    return this.companies.find((c) => c.email === email);
  },

  getCompanyById(id) {
    return this.companies.find((c) => c.id === id);
  },
};
