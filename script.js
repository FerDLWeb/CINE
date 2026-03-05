const EXCHANGE_RATE = 7.8;
const THEME_KEY = "cine_theme";

/*
  Usuarios de tarjeta autorizados (pruebas):
  1) Metodo: Tarjeta de credito | Nombre: Ana Lopez | Tarjeta: 4111 1111 1111 1111 | Vencimiento: 08/28 | CVV: 123
  2) Metodo: Tarjeta de debito | Nombre: Luis Ramirez | Tarjeta: 5555 5555 5555 4444 | Vencimiento: 11/29 | CVV: 456
*/
const AUTHORIZED_CARDS = [
  {
    method: "Tarjeta de credito",
    holder: "Ana Lopez",
    number: "4111111111111111",
    exp: "08/28",
    cvv: "123"
  },
  {
    method: "Tarjeta de debito",
    holder: "Luis Ramirez",
    number: "5555555555554444",
    exp: "11/29",
    cvv: "456"
  }
];

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
const paymentMethodHintEl = document.getElementById("paymentMethodHint");

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

function showCinemaAlert(message, tone = "success") {
  if (!window.Swal) return;

  const variants = {
    success: {
      icon: "success",
      title: "Funcion confirmada",
      button: "Ir a la sala"
    },
    error: {
      icon: "error",
      title: "Corte en proyeccion",
      button: "Intentar de nuevo"
    },
    info: {
      icon: "info",
      title: "Aviso del cine",
      button: "Entendido"
    }
  };

  const preset = variants[tone] || variants.info;

  window.Swal.fire({
    icon: preset.icon,
    title: preset.title,
    text: message,
    confirmButtonText: preset.button,
    customClass: {
      popup: "cinema-alert",
      title: "cinema-alert-title",
      htmlContainer: "cinema-alert-text",
      confirmButton: "cinema-alert-btn"
    },
    buttonsStyling: false,
    backdrop: "rgba(4, 9, 16, 0.78)",
    timer: tone === "success" ? 4200 : undefined,
    timerProgressBar: tone === "success"
  });
}

function setStatus(message, tone = "success", options = {}) {
  const { alert = true } = options;
  statusEl.textContent = message;
  statusEl.classList.remove("error");
  if (tone === "error") {
    statusEl.classList.add("error");
  }
  if (alert) {
    showCinemaAlert(message, tone);
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

function normalizeHolderName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExpDate(value) {
  const digits = toDigits(value);

  if (digits.length === 3) {
    return `0${digits.slice(0, 1)}/${digits.slice(1)}`;
  }

  if (digits.length === 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  if (digits.length === 6) {
    return `${digits.slice(0, 2)}/${digits.slice(4)}`;
  }

  return value.trim();
}

function holderNameMatches(inputName, registeredName) {
  const inputTokens = normalizeHolderName(inputName).split(" ").filter(Boolean);
  const registeredTokens = normalizeHolderName(registeredName).split(" ").filter(Boolean);

  if (inputTokens.length === 0 || registeredTokens.length === 0) {
    return false;
  }

  return registeredTokens.every((token) => inputTokens.includes(token));
}

function isCardMethod(method) {
  return method === "Tarjeta de credito" || method === "Tarjeta de debito";
}

function syncPaymentInputsByMethod() {
  const method = paymentMethodEl.value;
  const isCardPayment = isCardMethod(method);
  const paymentInputs = [cardNameEl, cardNumberEl, expDateEl, cvvEl];

  paymentInputs.forEach((input) => {
    input.disabled = !isCardPayment;
    input.required = isCardPayment;
  });

  if (!isCardPayment) {
    cardNameEl.value = "";
    cardNumberEl.value = "";
    expDateEl.value = "";
    cvvEl.value = "";
    cardNumberEl.placeholder = "1234 5678 9012 3456";
    cvvEl.placeholder = "123";
    if (paymentMethodHintEl) {
      paymentMethodHintEl.textContent = "Selecciona credito o debito para ingresar los datos requeridos.";
    }
    return;
  }

  cardNumberEl.placeholder = method === "Tarjeta de credito"
    ? "Numero de tarjeta de credito"
    : "Numero de tarjeta de debito";
  cvvEl.placeholder = method === "Tarjeta de credito" ? "CVV (3 o 4)" : "CVV (3)";

  if (paymentMethodHintEl) {
    paymentMethodHintEl.textContent = method === "Tarjeta de credito"
      ? "Credito: nombre, numero, vencimiento y CVV (3 o 4)."
      : "Debito: nombre, numero, vencimiento y CVV (3).";
  }
}

function validatePayment() {
  const method = paymentMethodEl.value;
  const name = cardNameEl.value.trim();
  const numberDigits = toDigits(cardNumberEl.value);
  const exp = normalizeExpDate(expDateEl.value);
  const cvvDigits = toDigits(cvvEl.value);

  if (!method) {
    return { valid: false, message: "Selecciona un metodo de pago." };
  }

  if (!isCardMethod(method)) {
    return { valid: false, message: "Metodo de pago no disponible." };
  }

  if (name.length < 3) {
    return { valid: false, message: "Ingresa el nombre del titular." };
  }

  if (numberDigits.length < 13 || numberDigits.length > 19) {
    return { valid: false, message: "Ingresa un numero de tarjeta valido." };
  }

  if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(exp)) {
    return { valid: false, message: "Fecha de vencimiento invalida. Usa MM/AA." };
  }

  if (method === "Tarjeta de credito" && (cvvDigits.length < 3 || cvvDigits.length > 4)) {
    return { valid: false, message: "Para credito, ingresa un CVV de 3 o 4 digitos." };
  }

  if (method === "Tarjeta de debito" && cvvDigits.length !== 3) {
    return { valid: false, message: "Para debito, ingresa un CVV de 3 digitos." };
  }

  const cardByNumber = AUTHORIZED_CARDS.find((card) => card.number === numberDigits);

  if (!cardByNumber) {
    return { valid: false, message: "Numero de tarjeta no autorizado." };
  }

  if (cardByNumber.method !== method) {
    return {
      valid: false,
      message: `Esta tarjeta solo esta autorizada para ${cardByNumber.method}.`
    };
  }

  if (!holderNameMatches(name, cardByNumber.holder)) {
    return { valid: false, message: "El nombre del titular no coincide con la tarjeta." };
  }

  if (cardByNumber.exp !== exp) {
    return { valid: false, message: "La fecha de vencimiento no coincide con la tarjeta." };
  }

  if (cardByNumber.cvv !== cvvDigits) {
    return { valid: false, message: "El CVV no coincide con la tarjeta." };
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
  syncPaymentInputsByMethod();
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

function drawStyledTicket(doc, reservation) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const frameX = 8;
  const frameY = 8;
  const frameW = pageWidth - 16;
  const frameH = pageHeight - 16;

  const ticketX = 12;
  const ticketY = 12;
  const ticketW = pageWidth - 24;
  const ticketH = pageHeight - 24;

  const mainX = 16;
  const mainY = 16;
  const mainW = pageWidth - 64;
  const mainH = pageHeight - 32;

  const stubX = mainX + mainW + 4;
  const stubY = mainY;
  const stubW = 36;
  const stubH = mainH;

  doc.setFillColor(13, 19, 28);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(140, 30, 45);
  doc.roundedRect(frameX, frameY, frameW, frameH, 6, 6, "F");

  doc.setFillColor(244, 237, 214);
  doc.roundedRect(ticketX, ticketY, ticketW, ticketH, 5, 5, "F");

  doc.setFillColor(17, 31, 51);
  doc.roundedRect(mainX, mainY, mainW, mainH, 4, 4, "F");

  doc.setFillColor(108, 18, 35);
  doc.roundedRect(stubX, stubY, stubW, stubH, 4, 4, "F");

  const perforationX = mainX + mainW + 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(244, 237, 214);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(perforationX, mainY + 2, perforationX, mainY + mainH - 2);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(13, 19, 28);
  doc.circle(perforationX, mainY + 2, 1.7, "F");
  doc.circle(perforationX, mainY + mainH - 2, 1.7, "F");

  doc.setTextColor(255, 214, 123);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CINE PREMIERE", mainX + 4, mainY + 10);

  doc.setTextColor(216, 226, 241);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Ticket oficial de funcion", mainX + 4, mainY + 15.5);

  const maxValueWidth = mainW - 44;
  let textY = mainY + 25;
  const rows = [
    ["Reserva", reservation.id],
    ["Pelicula", reservation.movieName],
    ["Horario", reservation.schedule],
    ["Pago", reservation.paymentMethod],
    ["Fecha", reservation.date]
  ];

  rows.forEach(([label, value]) => {
    const safeValue = toPdfSafeText(String(value));
    const lines = doc.splitTextToSize(safeValue, maxValueWidth);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 214, 123);
    doc.text(`${label}:`, mainX + 4, textY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(241, 246, 255);
    doc.text(lines, mainX + 28, textY);
    textY += Math.max(6, lines.length * 5.2);
  });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 214, 123);
  doc.setFontSize(10);
  doc.text("Asientos", mainX + 4, mainY + mainH - 25);

  let chipX = mainX + 4;
  let chipY = mainY + mainH - 20;
  reservation.seats.forEach((seat) => {
    const chipW = 9 + seat.length * 2.2;
    if (chipX + chipW > mainX + mainW - 4) {
      chipX = mainX + 4;
      chipY += 8;
    }

    doc.setFillColor(255, 214, 123);
    doc.roundedRect(chipX, chipY, chipW, 5.8, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(seat, chipX + chipW / 2, chipY + 3.9, { align: "center" });

    chipX += chipW + 1.8;
  });

  doc.setFillColor(255, 214, 123);
  doc.roundedRect(mainX + mainW - 58, mainY + mainH - 22, 54, 18, 2, 2, "F");
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TOTAL", mainX + mainW - 54, mainY + mainH - 15);
  doc.setFontSize(12.5);
  doc.text(formatPrice(reservation.totalGTQ, "GTQ"), mainX + mainW - 54, mainY + mainH - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.text(formatPrice(reservation.totalGTQ, "USD"), mainX + mainW - 54, mainY + mainH - 3.5);

  const stubCenterX = stubX + stubW / 2;
  doc.setTextColor(255, 214, 123);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ADMIT ONE", stubCenterX, stubY + 10, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(248, 248, 248);
  doc.text(toPdfSafeText(reservation.schedule), stubCenterX, stubY + 16, { align: "center" });
  doc.text(toPdfSafeText(reservation.id), stubCenterX, stubY + 21.5, { align: "center" });

  doc.setFontSize(8);
  doc.text("Sala 7", stubCenterX, stubY + 27, { align: "center" });
  doc.text("Asientos", stubCenterX, stubY + 33, { align: "center" });

  const stubSeatLines = doc.splitTextToSize(toPdfSafeText(reservation.seats.join(" ")), stubW - 6);
  doc.text(stubSeatLines, stubX + 3, stubY + 38);

  const seed = `${reservation.id}${reservation.seats.join("")}${reservation.schedule}`;
  let barX = stubX + 3.5;
  const barBaseY = stubY + stubH - 10;
  for (let i = 0; i < 44; i += 1) {
    const code = seed.charCodeAt(i % seed.length);
    const barW = code % 3 === 0 ? 0.9 : 0.45;
    const barH = code % 2 === 0 ? 16 : 12;
    doc.setFillColor(242, 237, 220);
    doc.rect(barX, barBaseY - barH, barW, barH, "F");
    barX += barW + 0.6;
    if (barX > stubX + stubW - 2) break;
  }

  doc.setTextColor(245, 245, 245);
  doc.setFontSize(7.5);
  doc.text(toPdfSafeText(reservation.id), stubCenterX, stubY + stubH - 3, { align: "center" });
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
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a5"
      });
      drawStyledTicket(doc, currentReservation);
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

paymentMethodEl.addEventListener("change", () => {
  clearStatus();
  syncPaymentInputsByMethod();
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
syncPaymentInputsByMethod();
initTheme();
renderMovies();
renderSeatMap();
renderSummary();
renderReservationInfo();
syncActionButtons();
