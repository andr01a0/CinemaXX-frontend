export default async (movieId) => {
  const content = document.querySelector(".content");

  const moviePageResponse = await fetch("./pages/movie/movie.html");
  const movieHtml = await moviePageResponse.text();
  content.innerHTML = movieHtml;

  const getMovieResponse = await fetch(`${window.apiUrl}/api/movie/${movieId}`);
  const movie = await getMovieResponse.json();
  //console.log(movie);
  document.querySelector(".movie-poster img").src = movie.poster;
  document.querySelector("h3.title").innerText = movie.title;
  document.querySelector("p.description").innerHTML = movie.description;
  document.querySelector("p.ageRestriction").innerHTML = movie.ageRestriction;
  document.querySelector("p.rating").innerHTML = movie.rating;

  const today = new Date();

  const timeSlotsList = document.querySelector(".dropdown-content");
  timeSlotsList.addEventListener("change", handleTimeSlotChange);

  // create default empty option
  const timeSlotDefault = document.createElement("option");
  timeSlotDefault.value = "";
  timeSlotDefault.textContent = "Select Day and Time";
  timeSlotsList.appendChild(timeSlotDefault);

  const filteredTimeSlots = movie.timeSlots.filter((timeSlot) => {
    const dateToCheck = formatDatetimeToJavascriptDate(timeSlot.scheduledTime);
    return checkIfDateIsBigger(dateToCheck, today);
  });
  console.log(filteredTimeSlots);
  filteredTimeSlots.forEach((timeSlot) => {
    const timeSlotItem = document.createElement("option");

    timeSlotItem.value = timeSlot.timeSlotId;
    timeSlotItem.textContent = getTimeForCustomer(timeSlot.scheduledTime);
    timeSlotsList.appendChild(timeSlotItem);
  });

  function getTimeForCustomer(datetime) {
    const t = datetime.split(/[T]/);
    const h = t[1].split(/[:]/);
    return `${t[0]} ${h[0]}:${h[1]}`;
  }

  function formatDatetimeToJavascriptDate(datetime) {
    const t = datetime.split(/[- :T]/);
    const d = new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5]));
    return d;
  }

  function checkIfDateIsBigger(check, fromDate) {
    return check.getTime() >= fromDate.getTime();
  }

  ////////////////////////////////////////////////////////////////////////
  //                     Functions related to seats                     //
  ////////////////////////////////////////////////////////////////////////
  async function handleTimeSlotChange(event) {
    const seatsWrapper = document.querySelector(
      "div.movie-booking > div.seats-wrapper"
    );

    if (event.target.value == "") seatsWrapper.style.visibility = "hidden";
    else {
      const seatsContainer = document.querySelector(
        "div.movie-booking > div.seats-wrapper > div.seats-container"
      );
      const button = document.querySelector(".seats-wrapper button");
      button.addEventListener("click", handleContinue);

      const requestHeader = {
        Authorization: `Bearer ${localStorage.getItem("user")}`,
      };

      const tUrl = new URL(
        `${window.apiUrl}/api/theater?movieId=${movieId}&timeSlotId=${event.target.value}`
      );
      // get the theaterHall based on the movie and timeSlot
      const getTheaterHallResponse = await fetch(tUrl, {
        headers: requestHeader,
      });
      const theaterHall = await getTheaterHallResponse.json();

      const bUrl = new URL(`${window.apiUrl}/api/bookings`);
      bUrl.searchParams.append("theaterHall", theaterHall.theaterHallId);
      bUrl.searchParams.append(
        "startTime",
        event.target.options[event.target.selectedIndex].text + ":00"
      );

      const getSeatsResponse = await fetch(bUrl, {
        headers: requestHeader,
      });

      const { freeSeats, bookedSeats } = await getSeatsResponse.json();

      clearSeats(seatsContainer);
      populateSeatsContainer(seatsContainer, freeSeats, bookedSeats);

      const seatsContent = seatsContainer.querySelectorAll(".seat-content");
      highlightFreeSeats(seatsContent, freeSeats);
      highlightBookedSeats(seatsContent, bookedSeats);

      const clearSelected = (selected) => {
        const isFree = freeSeats.some(
          (freeSeat) => freeSeat.seatNumber === selected
        );

        [...seatsContent]
          .filter((_seat) => _seat.textContent === selected)
          .forEach((_seat) => {
            _seat.classList.remove("selected");
            _seat.classList.add(isFree ? "free" : "booked");
          });

        button.disabled = true;
        button.removeAttribute("data-seat-number");
        button.removeAttribute("data-seat");
        button.removeAttribute("data-time-slot");
        button.removeAttribute("data-theater-hall");
      };

      const buttonAttributes = {
        timeSlot: event.target.value,
        theaterHall: theaterHall.theaterHallId,
      };

      addSelectSeatHandler(
        seatsContent,
        button,
        clearSelected,
        buttonAttributes
      );
      clearSelected();

      seatsWrapper.style.visibility = "visible";
    }
  }

  function handleContinue(event) {
    window.router.navigate(
      `#/movie/${movieId}/booking?&seatId=${event.target.getAttribute(
        "data-seat"
      )}&timeSlotId=${event.target.getAttribute(
        "data-time-slot"
      )}&theaterHallId=${event.target.getAttribute("data-theater-hall")}`
    );
  }

  function addSelectSeatHandler(
    seatsContent,
    button,
    clearSelected,
    attributes
  ) {
    [...seatsContent].forEach((seat) => {
      seat.addEventListener("click", (event) => {
        const { target } = event;
        const selected = button.getAttribute("data-seat-number");
        clearSelected(selected);

        if (target.classList.contains("free")) {
          clearSelected(target.textContent);
          button.disabled = false;
          button.setAttribute("data-seat-number", target.textContent);
          button.setAttribute("data-seat", target.getAttribute("data-seat"));
          button.setAttribute("data-time-slot", attributes.timeSlot);
          button.setAttribute("data-theater-hall", attributes.theaterHall);
          target.classList.remove("free");
          target.classList.add("selected");
          return;
        }
      });
    });
  }

  function populateSeatsContainer(seatsContainer, freeSeats, bookedSeats) {
    const allSeats = sortSeats([...freeSeats, ...bookedSeats]);

    allSeats.forEach((seat) => {
      const seatElement = document.createElement("div");
      seatElement.classList.add("seat");
      const seatContentElement = document.createElement("div");
      seatContentElement.classList.add("seat-content");
      seatContentElement.textContent = seat.seatNumber;
      seatContentElement.setAttribute("data-seat", seat.seatId);

      seatsContainer.appendChild(seatElement);
      seatElement.appendChild(seatContentElement);
    });
  }

  function highlightFreeSeats(seatsContent, freeSeats) {
    [...seatsContent]
      .filter((seat) =>
        freeSeats.some((freeSeat) => freeSeat.seatNumber === seat.textContent)
      )
      .forEach((seat) => seat.classList.add("free"));
  }

  function highlightBookedSeats(seatsContent, bookedSeats) {
    [...seatsContent]
      .filter((seat) =>
        bookedSeats.some(
          (bookedSeat) => bookedSeat.seatNumber === seat.textContent
        )
      )
      .forEach((seat) => seat.classList.add("booked"));
  }

  function sortSeats(seats) {
    return seats.sort((a, b) => {
      const aN = Number(a.seatNumber.replaceAll("-", ""));
      const bN = Number(b.seatNumber.replaceAll("-", ""));

      return aN - bN;
    });
  }

  function clearSeats(seatsContainer) {
    seatsContainer.innerHTML = "";
  }
};
