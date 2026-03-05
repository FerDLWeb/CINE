const EXCHANGE_RATE = 7.8;
const THEME_KEY = "cine_theme";

const movies = [
  {
    id: "movie-1",
    name: "Duna: Parte Dos",
    schedule: "18:30",
    priceGTQ: 45,
    poster: "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg"
  },
  {
    id: "movie-2",
    name: "Spider-Man: Across the Spider-Verse",
    schedule: "20:15",
    priceGTQ: 42,
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "movie-3",
    name: "Interstellar",
    schedule: "21:00",
    priceGTQ: 40,
    poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80"
  }
];

const seatRows = ["A", "B", "C", "D", "E", "F", "G", "H"];
const seatsPerRow = 10;

let selectedMovieId = movies[0].id;
let selectedSeats = new Set();
let currency = "GTQ";
let currentReservation = null;

const occupiedByMovie = {
  "movie-1": new Set(["A2", "A6", "B4", "C5", "D1", "F7"]),
  "movie-2": new Set(["A3", "B1", "C4", "D6", "E8", "G2"]),
  "movie-3": new Set(["A4", "B7", "C3", "E1", "F5", "H8"])
};

const moviesEl = document.getElementById("movies");
const seatMapEl = document.getElementById("seatMap");
const selectedMovieEl = document.getElementById("selectedMovie");
const selectedScheduleEl = document.getElementById("selectedSchedule");
const selectedSeatsEl = document.getElementById("selectedSeats");
const ticketCountEl = document.getElementById("ticketCount");
const totalPriceEl = document.getElementById("totalPrice");
const currencyEl = document.getElementById("currency");
const themeToggleEl = document.getElementById("themeToggle");
const paymentFormEl = document.getElementById("paymentForm");
const paymentMethodEl = document.getElementById("paymentMethod");
const cardNameEl = document.getElementById("cardName");
const cardNumberEl = document.getElementById("cardNumber");
const expDateEl = document.getElementById("expDate");
const cvvEl = document.getElementById("cvv");
const cancelBtnEl = document.getElementById("cancelBtn");
const pdfBtnEl = document.getElementById("pdfBtn");
const statusEl = document.getElementById("status");
const reservationIdEl = document.getElementById("reservationId");
const reservationPaymentEl = document.getElementById("reservationPayment");
const reservationDateEl = document.getElementById("reservationDate");

function getMovie() {
  return movies.find((movie) => movie.id === selectedMovieId);
}

function seatSort(a, b) {
  const rowA = a.charCodeAt(0);
  const rowB = b.charCodeAt(0);
  if (rowA !== rowB) return rowA - rowB;
  return Number(a.slice(1)) - Number(b.slice(1));
}

function formatPrice(priceGTQ, selectedCurrency) {
  if (selectedCurrency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceGTQ / EXCHANGE_RATE);
  }
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    maximumFractionDigits: 2
  }).format(priceGTQ);
}

function dualPriceLabel(priceGTQ) {
  return `${formatPrice(priceGTQ, "GTQ")} / ${formatPrice(priceGTQ, "USD")}`;
}

function setStatus(message, tone = "success") {
  statusEl.textContent = message;
  statusEl.classList.remove("error");
  if (tone === "error") {
    statusEl.classList.add("error");
  }
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.classList.remove("error");
}

function renderMovies() {
  moviesEl.innerHTML = "";

  movies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";
    if (movie.id === selectedMovieId) card.classList.add("active");

    card.innerHTML = `
      <img src="${movie.poster}" alt="Poster de ${movie.name}" />
      <div class="movie-card-content">
        <h4>${movie.name}</h4>
        <p><strong>Horario:</strong> ${movie.schedule}</p>
        <p><strong>Precio:</strong> ${dualPriceLabel(movie.priceGTQ)}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      if (selectedMovieId === movie.id) return;
      selectedMovieId = movie.id;
      selectedSeats = new Set();
      clearStatus();
      renderMovies();
      renderSeatMap();
      renderSummary();
    });

    moviesEl.appendChild(card);
  });
}

function renderSeatMap() {
  seatMapEl.innerHTML = "";

  seatRows.forEach((row) => {
    for (let num = 1; num <= seatsPerRow; num += 1) {
      const seatId = `${row}${num}`;
      const seatBtn = document.createElement("button");
      seatBtn.type = "button";
      seatBtn.className = "seat";
      seatBtn.textContent = seatId;

      const occupied = occupiedByMovie[selectedMovieId].has(seatId);
      if (occupied) {
        seatBtn.disabled = true;
        seatBtn.classList.add("seat-occupied");
      } else if (selectedSeats.has(seatId)) {
        seatBtn.classList.add("seat-selected");
      } else {
        seatBtn.classList.add("seat-free");
      }

      seatBtn.addEventListener("click", () => {
        if (selectedSeats.has(seatId)) {
          selectedSeats.delete(seatId);
        } else {
          selectedSeats.add(seatId);
        }
        clearStatus();
        renderSeatMap();
        renderSummary();
      });

      seatMapEl.appendChild(seatBtn);
    }
  });
}

function renderSummary() {
  const movie = getMovie();
  const quantity = selectedSeats.size;
  const totalGTQ = quantity * movie.priceGTQ;
  const sortedSeats = Array.from(selectedSeats).sort(seatSort);
  const oppositeCurrency = currency === "GTQ" ? "USD" : "GTQ";

  selectedMovieEl.textContent = movie.name;
  selectedScheduleEl.textContent = movie.schedule;
  selectedSeatsEl.textContent = quantity > 0 ? sortedSeats.join(", ") : "Ninguno";
  ticketCountEl.textContent = String(quantity);
  totalPriceEl.textContent = `${formatPrice(totalGTQ, currency)} (${formatPrice(totalGTQ, oppositeCurrency)})`;
}

function renderReservationInfo() {
  if (!currentReservation) {
    reservationIdEl.textContent = "Sin reserva";
    reservationPaymentEl.textContent = "-";
    reservationDateEl.textContent = "-";
    return;
  }

  reservationIdEl.textContent = currentReservation.id;
  reservationPaymentEl.textContent = currentReservation.paymentMethod;
  reservationDateEl.textContent = currentReservation.date;
}

function syncActionButtons() {
  const hasReservation = Boolean(currentReservation);
  cancelBtnEl.disabled = !hasReservation;
  pdfBtnEl.disabled = !hasReservation;
}

function toDigits(value) {
  return value.replace(/\D/g, "");
}

function validatePayment() {
  const method = paymentMethodEl.value;
  const name = cardNameEl.value.trim();
  const numberDigits = toDigits(cardNumberEl.value);
  const exp = expDateEl.value.trim();
  const cvvDigits = toDigits(cvvEl.value);

  if (!method) {
    return { valid: false, message: "Selecciona un metodo de pago." };
  }

  if (name.length < 3) {
    return { valid: false, message: "Ingresa el nombre del titular." };
  }

  if (method === "PayPal") {
    return { valid: true, method };
  }

  if (numberDigits.length < 13 || numberDigits.length > 19) {
    return { valid: false, message: "Ingresa un numero de tarjeta valido." };
  }

  if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(exp)) {
    return { valid: false, message: "Fecha de vencimiento invalida. Usa MM/AA." };
  }

  if (cvvDigits.length < 3 || cvvDigits.length > 4) {
    return { valid: false, message: "Ingresa un CVV valido." };
  }

  return { valid: true, method };
}

function reserveSeats(event) {
  event.preventDefault();

  const movie = getMovie();
  const sortedSeats = Array.from(selectedSeats).sort(seatSort);

  if (sortedSeats.length === 0) {
    setStatus("Selecciona al menos un asiento antes de reservar.", "error");
    return;
  }

  const paymentCheck = validatePayment();
  if (!paymentCheck.valid) {
    setStatus(paymentCheck.message, "error");
    return;
  }

  const occupied = occupiedByMovie[movie.id];
  const alreadyOccupied = sortedSeats.find((seatId) => occupied.has(seatId));
  if (alreadyOccupied) {
    setStatus(`El asiento ${alreadyOccupied} ya no esta disponible.`, "error");
    renderSeatMap();
    return;
  }

  sortedSeats.forEach((seatId) => occupied.add(seatId));

  const totalGTQ = sortedSeats.length * movie.priceGTQ;
  currentReservation = {
    id: `RES-${Math.floor(Date.now() / 1000)}`,
    movieId: movie.id,
    movieName: movie.name,
    schedule: movie.schedule,
    seats: sortedSeats,
    totalGTQ,
    totalUSD: Number((totalGTQ / EXCHANGE_RATE).toFixed(2)),
    paymentMethod: paymentCheck.method,
    date: new Date().toLocaleString("es-GT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  selectedSeats = new Set();
  paymentFormEl.reset();
  clearStatus();
  setStatus(`Reserva confirmada (${currentReservation.id}) para ${currentReservation.movieName}.`);

  renderSeatMap();
  renderSummary();
  renderReservationInfo();
  syncActionButtons();
}

function cancelReservation() {
  if (!currentReservation) {
    setStatus("No hay una reserva activa para cancelar.", "error");
    return;
  }

  const { movieId, seats, id } = currentReservation;
  const occupied = occupiedByMovie[movieId];
  seats.forEach((seatId) => occupied.delete(seatId));

  currentReservation = null;
  clearStatus();
  setStatus(`Reserva ${id} cancelada. Los asientos volvieron a estar disponibles.`);

  renderSeatMap();
  renderSummary();
  renderReservationInfo();
  syncActionButtons();
}

function getTicketLines() {
  return [
    `Codigo de reserva: ${currentReservation.id}`,
    `Pelicula: ${currentReservation.movieName}`,
    `Horario: ${currentReservation.schedule}`,
    `Asientos: ${currentReservation.seats.join(", ")}`,
    `Pago: ${currentReservation.paymentMethod}`,
    `Total GTQ: ${formatPrice(currentReservation.totalGTQ, "GTQ")}`,
    `Total USD: ${formatPrice(currentReservation.totalGTQ, "USD")}`,
    `Fecha: ${currentReservation.date}`
  ];
}

function downloadBlobAsFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 0);
}

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toPdfSafeText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
}

function generateFallbackPdf(lines, fileName) {
  const safeLines = lines.map((line) => escapePdfText(toPdfSafeText(line)));
  const commands = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    "(Boleto de Cine) Tj",
    "0 -30 Td",
    "/F1 11 Tf"
  ];

  safeLines.forEach((line, index) => {
    commands.push(`(${line}) Tj`);
    if (index !== safeLines.length - 1) {
      commands.push("0 -18 Td");
    }
  });

  commands.push("ET");

  const stream = `${commands.join("\n")}\n`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) {
    bytes[i] = pdf.charCodeAt(i);
  }

  downloadBlobAsFile(new Blob([bytes], { type: "application/pdf" }), fileName);
}

function generateTicketPdf() {
  if (!currentReservation) {
    setStatus("No hay reserva activa para generar PDF.", "error");
    return;
  }

  const lines = getTicketLines();
  const fileName = `boleto-${currentReservation.id}.pdf`;

  try {
    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFillColor(14, 93, 88);
      doc.rect(0, 0, 210, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Boleto de Cine", 14, 16);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);

      let y = 38;
      lines.forEach((line) => {
        doc.text(line, 14, y);
        y += 8;
      });

      doc.save(fileName);
      setStatus("Boleto PDF generado correctamente.");
      return;
    }

    generateFallbackPdf(lines, fileName);
    setStatus("Boleto PDF generado correctamente (modo compatible).");
  } catch (error) {
    console.error(error);
    setStatus("No fue posible generar el PDF en este navegador.", "error");
  }
}

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  themeToggleEl.textContent = dark ? "Modo Claro" : "Modo Oscuro";
}

function initTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(storedTheme);
}

function bindInputMasks() {
  cardNumberEl.addEventListener("input", () => {
    const digits = toDigits(cardNumberEl.value).slice(0, 19);
    cardNumberEl.value = digits.replace(/(.{4})/g, "$1 ").trim();
  });

  expDateEl.addEventListener("input", () => {
    const digits = toDigits(expDateEl.value).slice(0, 4);
    if (digits.length <= 2) {
      expDateEl.value = digits;
      return;
    }
    expDateEl.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  });

  cvvEl.addEventListener("input", () => {
    cvvEl.value = toDigits(cvvEl.value).slice(0, 4);
  });
}

currencyEl.addEventListener("change", (event) => {
  currency = event.target.value;
  renderSummary();
});

themeToggleEl.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});

paymentFormEl.addEventListener("submit", reserveSeats);
cancelBtnEl.addEventListener("click", cancelReservation);
pdfBtnEl.addEventListener("click", generateTicketPdf);

bindInputMasks();
initTheme();
renderMovies();
renderSeatMap();
renderSummary();
renderReservationInfo();
syncActionButtons();
