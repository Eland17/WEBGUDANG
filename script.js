// Format angka dengan 2 desimal dan format ribuan Indonesia
function formatAngka(num) {
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace(",", ".");
}

// Format tanggal ke format dd-mm-yyyy
function formatTanggal(tgl) {
  const dateObj = new Date(tgl);
  if (isNaN(dateObj)) return "-";
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

let dataMasuk = [];
let dataKeluar = [];
let stokArray = [];
let currentPage = 1;
const rowsPerPage = 20;

// Ambil data dari Firestore
async function loadData() {
  try {
    const [snapMasuk, snapKeluar] = await Promise.all([
      db.collection('barangMasuk').get(),
      db.collection('barangKeluar').get()
    ]);

    dataMasuk = snapMasuk.docs.map(doc => doc.data());
    dataKeluar = snapKeluar.docs.map(doc => doc.data());

    hitungStok();
    tampilkanData();
    updateMarqueeFromDataMasuk();
  } catch (error) {
    console.error("Gagal ambil data Firestore:", error);
    alert("Gagal mengambil data dari Firestore.");
  }
}

// Hitung stok
function hitungStok() {
  const map = {};
  dataMasuk.forEach(item => {
    const key = item.kode_barang;
    if (!map[key]) {
      map[key] = {
        kode_barang: key,
        kode_buyer: item.kode_buyer || '',
        nama_barang: item.nama_barang || '',
        satuan: item.satuan || '',
        jumlah_masuk: 0,
        jumlah_keluar: 0
      };
    }
    map[key].jumlah_masuk += parseFloat(item.jumlah) || 0;
  });

  dataKeluar.forEach(item => {
    const key = item.kode_barang;
    if (!map[key]) {
      map[key] = {
        kode_barang: key,
        kode_buyer: item.kode_buyer || '',
        nama_barang: item.nama_barang || '',
        satuan: item.satuan || '',
        jumlah_masuk: 0,
        jumlah_keluar: 0
      };
    }
    map[key].jumlah_keluar += parseFloat(item.jumlah) || 0;
  });

  stokArray = Object.values(map);
}

// Tampilkan data dengan filter termasuk tanggal
function tampilkanData() {
  const tbody = document.querySelector('#tabelInventory tbody');
  tbody.innerHTML = "";

  stokArray.sort((a, b) => a.kode_barang.localeCompare(b.kode_barang));

  const filterKode = document.getElementById("filterKodeBarang").value.toLowerCase();
  const filterBuyer = document.getElementById("filterKodeBuyer").value.toLowerCase();
  const filterNama = document.getElementById("filterNamaBarang").value.toLowerCase();

  const filterTanggalDari = document.getElementById("filterTanggalDari").value;
  const filterTanggalSampai = document.getElementById("filterTanggalSampai").value;

  const tanggalDari = filterTanggalDari ? new Date(filterTanggalDari) : null;
  const tanggalSampai = filterTanggalSampai ? new Date(filterTanggalSampai) : null;

  const filtered = stokArray.filter(item => {
    if (!item.kode_barang.toLowerCase().includes(filterKode)) return false;
    if (!item.kode_buyer.toLowerCase().includes(filterBuyer)) return false;
    if (!item.nama_barang.toLowerCase().includes(filterNama)) return false;

    if (tanggalDari || tanggalSampai) {
      // cek apakah ada barang masuk untuk item ini dengan tanggal sesuai filter
      const dataMasukItem = dataMasuk.filter(dm => dm.kode_barang === item.kode_barang);

      const adaTanggalSesuai = dataMasukItem.some(dm => {
        let tgl = null;
        if (dm.tanggal?.toDate) {
          tgl = dm.tanggal.toDate();
        } else if (typeof dm.tanggal === "string") {
          tgl = new Date(dm.tanggal);
        }
        if (!tgl || isNaN(tgl)) return false;

        if (tanggalDari && tgl < tanggalDari) return false;
        if (tanggalSampai && tgl > tanggalSampai) return false;
        return true;
      });

      if (!adaTanggalSesuai) return false;
    }

    return true;
  });

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageItems = filtered.slice(start, end);

  pageItems.forEach(item => {
    const stok = item.jumlah_masuk - item.jumlah_keluar;
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${item.kode_barang}</td>
      <td>${item.kode_buyer}</td>
      <td style="text-align: left;">${item.nama_barang}</td>
      <td>${item.satuan}</td>
      <td style="text-align: right;">${formatAngka(item.jumlah_masuk)}</td>
      <td style="text-align: right;">${formatAngka(item.jumlah_keluar)}</td>
    `;

    const tdStok = document.createElement('td');
    tdStok.style.textAlign = "right";
    tdStok.textContent = formatAngka(stok);

    if (stok === 0) {
      tdStok.style.backgroundColor = '#ffcccc'; // merah muda
    } else if (stok < 6) {
      tdStok.style.backgroundColor = '#fff3cd'; // oranye muda
    }

    tr.appendChild(tdStok);

    tbody.appendChild(tr);
  });

  const pageInfo = document.getElementById("pageInfo");
  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;

  // Disable tombol pagination
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// Marquee informasi
function updateMarqueeFromDataMasuk() {
  const marquee = document.getElementById("marqueeInfoFooter");
  if (!marquee) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const limaHariLalu = new Date();
  limaHariLalu.setDate(now.getDate() - 5);
  limaHariLalu.setHours(0, 0, 0, 0);

  const dataFiltered = dataMasuk.filter(item => {
    const tgl = item.tanggal?.toDate ? item.tanggal.toDate() : new Date(item.tanggal);
    if (isNaN(tgl)) return false;
    return tgl >= limaHariLalu && tgl <= now;
  });

  if (dataFiltered.length === 0) {
    marquee.textContent = "Tidak ada data barang masuk dalam 5 hari terakhir.";
    return;
  }

  const dataSorted = dataFiltered.sort((a, b) => {
    const dateA = a.tanggal?.toDate ? a.tanggal.toDate() : new Date(a.tanggal);
    const dateB = b.tanggal?.toDate ? b.tanggal.toDate() : new Date(b.tanggal);
    return dateA - dateB;
  }).slice(0, 5);

  const teks = dataSorted.map(item => {
    const tanggal = formatTanggal(item.tanggal?.toDate ? item.tanggal.toDate() : item.tanggal);
    const namaBarang = item.nama_barang || "-";
    const buyer = item.kode_buyer || "-";
    const jumlah = formatAngka(item.jumlah || 0);
    const satuan = item.satuan || "-";
    return `Tanggal: ${tanggal} | Barang: ${namaBarang} | Buyer: ${buyer} | Jumlah: ${jumlah} ${satuan}`;
  }).join("     ⚬     ");

  marquee.textContent = teks;
}

// Pagination tombol
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    tampilkanData();
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  const filterKode = document.getElementById("filterKodeBarang").value.toLowerCase();
  const filterBuyer = document.getElementById("filterKodeBuyer").value.toLowerCase();
  const filterNama = document.getElementById("filterNamaBarang").value.toLowerCase();

  const filterTanggalDari = document.getElementById("filterTanggalDari").value;
  const filterTanggalSampai = document.getElementById("filterTanggalSampai").value;

  const tanggalDari = filterTanggalDari ? new Date(filterTanggalDari) : null;
  const tanggalSampai = filterTanggalSampai ? new Date(filterTanggalSampai) : null;

  const filtered = stokArray.filter(item => {
    if (!item.kode_barang.toLowerCase().includes(filterKode)) return false;
    if (!item.kode_buyer.toLowerCase().includes(filterBuyer)) return false;
    if (!item.nama_barang.toLowerCase().includes(filterNama)) return false;

    if (tanggalDari || tanggalSampai) {
      const dataMasukItem = dataMasuk.filter(dm => dm.kode_barang === item.kode_barang);

      const adaTanggalSesuai = dataMasukItem.some(dm => {
        let tgl = null;
        if (dm.tanggal?.toDate) {
          tgl = dm.tanggal.toDate();
        } else if (typeof dm.tanggal === "string") {
          tgl = new Date(dm.tanggal);
        }
        if (!tgl || isNaN(tgl)) return false;

        if (tanggalDari && tgl < tanggalDari) return false;
        if (tanggalSampai && tgl > tanggalSampai) return false;
        return true;
      });

      if (!adaTanggalSesuai) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    tampilkanData();
  }
});

// Filter realtime (semua input filter)
document.querySelectorAll(".filters input").forEach(input => {
  input.addEventListener("input", () => {
    currentPage = 1;
    tampilkanData();
  });
});

// Export PDF
document.getElementById("exportPdf").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(10);
  doc.text("Laporan Stok Barang", 14, 10);

  const rows = stokArray.map(item => [
    item.kode_barang,
    item.kode_buyer,
    item.nama_barang,
    item.satuan,
    formatAngka(item.jumlah_masuk),
    formatAngka(item.jumlah_keluar),
    formatAngka(item.jumlah_masuk - item.jumlah_keluar)
  ]);

  doc.autoTable({
    startY: 14,
    head: [['Kode', 'Buyer', 'Nama Barang', 'Satuan', 'Masuk', 'Keluar', 'Stok']],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [0, 123, 255],
      textColor: 255,
      halign: 'center'
    },
    columnStyles: {
      2: { halign: 'left' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    },
    didDrawPage: function (data) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      doc.text("Copyright © 2024 Eland", pageWidth - 40, pageHeight - 5);
    }
  });

  doc.save('laporan-stok-barang.pdf');
});

// Export Excel
document.getElementById("exportExcel").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Kode', 'Buyer', 'Nama Barang', 'Satuan', 'Masuk', 'Keluar', 'Stok'],
    ...stokArray.map(item => [
      item.kode_barang,
      item.kode_buyer,
      item.nama_barang,
      item.satuan,
      parseFloat(item.jumlah_masuk),
      parseFloat(item.jumlah_keluar),
      parseFloat(item.jumlah_masuk - item.jumlah_keluar)
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Stok");
  XLSX.writeFile(wb, "laporan-stok-barang.xlsx");
});

// Mulai load data saat halaman dibuka
window.addEventListener("DOMContentLoaded", loadData);
