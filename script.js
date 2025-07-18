const dataMasuk = JSON.parse(localStorage.getItem('dataMasuk')) || [];
const dataKeluar = JSON.parse(localStorage.getItem('dataKeluar')) || [];
let stokArray = [];
let fullStokArray = [];
let currentPage = 1;
const rowsPerPage = 20;

function hitungStok() {
  const map = {};
  dataMasuk.forEach(item => {
    const key = item.kode_barang;
    if (!map[key]) {
      map[key] = {
        kode_barang: item.kode_barang,
        kode_buyer: item.kode_buyer || '-',
        nama_barang: item.nama_barang,
        satuan: item.satuan || '-',
        masuk: 0,
        keluar: 0
      };
    }
    map[key].masuk += parseInt(item.jumlah);
  });

  dataKeluar.forEach(item => {
    const key = item.kode_barang;
    if (!map[key]) {
      map[key] = {
        kode_barang: item.kode_barang,
        kode_buyer: item.kode_buyer || '-',
        nama_barang: item.nama_barang,
        satuan: item.satuan || '-',
        masuk: 0,
        keluar: 0
      };
    }
    map[key].keluar += parseInt(item.jumlah);
  });

  fullStokArray = Object.values(map);

  // 🔽 Urutkan berdasarkan kode_barang (A-Z)
  fullStokArray.sort((a, b) => a.kode_barang.localeCompare(b.kode_barang));

  stokArray = fullStokArray;
}

function filterData() {
  const kode = document.getElementById('filterKodeBarang').value.toLowerCase();
  const buyer = document.getElementById('filterKodeBuyer').value.toLowerCase();
  const nama = document.getElementById('filterNamaBarang').value.toLowerCase();
  const dari = document.getElementById('filterTanggalDari').value;
  const sampai = document.getElementById('filterTanggalSampai').value;

  stokArray = fullStokArray.filter(item => {
    const matchKode = item.kode_barang.toLowerCase().includes(kode);
    const matchBuyer = item.kode_buyer.toLowerCase().includes(buyer);
    const matchNama = item.nama_barang.toLowerCase().includes(nama);

    if (!dari && !sampai) return matchKode && matchBuyer && matchNama;

    const masukTerkait = dataMasuk.find(m => m.kode_barang === item.kode_barang && m.tanggal);
    if (!masukTerkait) return false;

    const tglMasuk = new Date(masukTerkait.tanggal);
    const tglDari = dari ? new Date(dari) : null;
    const tglSampai = sampai ? new Date(sampai) : null;

    const matchTanggal = (!tglDari || tglMasuk >= tglDari) && (!tglSampai || tglMasuk <= tglSampai);

    return matchKode && matchBuyer && matchNama && matchTanggal;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.querySelector('#tabelInventory tbody');
  tbody.innerHTML = '';
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageItems = stokArray.slice(start, end);

  pageItems.forEach(data => {
    const sisa = data.masuk - data.keluar;
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${data.kode_barang}</td>
      <td>${data.kode_buyer}</td>
      <td class="nama-barang">${data.nama_barang}</td>
      <td>${data.satuan}</td>
      <td class="angka-kanan">${data.masuk.toLocaleString('id-ID')}</td>
      <td class="angka-kanan">${data.keluar.toLocaleString('id-ID')}</td>
    `;

    let stokTd = document.createElement('td');
    stokTd.classList.add('angka-kanan');
    stokTd.textContent = (sisa).toLocaleString('id-ID');

    if (sisa === 0) {
      stokTd.style.backgroundColor = '#f8d7da'; // merah muda
    } else if (sisa < 6) {
      stokTd.style.backgroundColor = '#fff3cd'; // kuning muda
    }

    row.appendChild(stokTd);
    tbody.appendChild(row);
  });

  const totalPages = Math.ceil(stokArray.length / rowsPerPage);
  document.getElementById('pageInfo').textContent = `Halaman ${currentPage} dari ${totalPages}`;

  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

function nextPage() {
  const totalPages = Math.ceil(stokArray.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

function tampilkanInfoMarquee() {
  const marquee = document.getElementById("marqueeInfo");
  const now = new Date();
  const batas = new Date();
  batas.setDate(now.getDate() - 5);

  const terbaru = dataMasuk.filter(item => {
    if (!item.tanggal) return false;
    const tglItem = new Date(item.tanggal);
    return tglItem >= batas && tglItem <= now;
  });

  const text = terbaru.map(item => {
    const tgl = new Date(item.tanggal);
    const tglFormat = `${tgl.getDate().toString().padStart(2, '0')}-${(tgl.getMonth() + 1).toString().padStart(2, '0')}-${tgl.getFullYear()}`;
    return `${tglFormat}: (${item.kode_buyer}) ${item.nama_barang} masuk ${parseInt(item.jumlah).toLocaleString('id-ID')} ${item.satuan || ''}`;
  }).join(' | ');

  marquee.textContent = text || 'Tidak ada barang masuk dalam 5 hari terakhir.';
}

// Filter event listeners
document.getElementById('filterKodeBarang').addEventListener('input', filterData);
document.getElementById('filterKodeBuyer').addEventListener('input', filterData);
document.getElementById('filterNamaBarang').addEventListener('input', filterData);
document.getElementById('filterTanggalDari').addEventListener('change', filterData);
document.getElementById('filterTanggalSampai').addEventListener('change', filterData);

// Pagination event listeners
document.getElementById('prevPage').addEventListener('click', prevPage);
document.getElementById('nextPage').addEventListener('click', nextPage);

// Export PDF
document.getElementById("exportPdf").addEventListener("click", function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  const headers = [["Kode Barang", "Kode Buyer", "Nama Barang", "Satuan", "Jumlah Masuk", "Jumlah Keluar", "Stok Tersisa"]];
  const data = stokArray.map(item => {
    const sisa = item.masuk - item.keluar;
    return [
      item.kode_barang,
      item.kode_buyer,
      item.nama_barang,
      item.satuan,
      item.masuk.toLocaleString('id-ID'),
      item.keluar.toLocaleString('id-ID'),
      sisa.toLocaleString('id-ID')
    ];
  });

  doc.setFontSize(12);
  doc.text("Laporan Stok Barang - Inventory Gudang", 280, 15, { align: "right" });

  doc.autoTable({
    head: headers,
    body: data,
    startY: 20,
    theme: "grid",
    styles: {
      fontSize: 7,
      halign: "right",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [173, 216, 230],
      textColor: [0, 0, 0],
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'left' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    }
  });

  doc.save("Laporan_Stok_Gudang.pdf");
});

// Export Excel
document.getElementById("exportExcel").addEventListener("click", function () {
  const wb = XLSX.utils.book_new();
  const ws_data = [
    ["Kode Barang", "Kode Buyer", "Nama Barang", "Satuan", "Jumlah Masuk", "Jumlah Keluar", "Stok Tersisa"],
    ...stokArray.map(item => {
      const sisa = item.masuk - item.keluar;
      return [
        item.kode_barang,
        item.kode_buyer,
        item.nama_barang,
        item.satuan,
        item.masuk,
        item.keluar,
        sisa
      ];
    })
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  XLSX.writeFile(wb, "Laporan_Stok_Gudang.xlsx");
});

// Inisialisasi
hitungStok();
renderTable();
tampilkanInfoMarquee();
