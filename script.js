'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const removeButton = document.querySelector('.remove-btn');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(clickedPosition, distance, duration) {
    this.clickedPosition = clickedPosition; // array of coords [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    // = 🏃‍♂️ Running on October 13
  }
}

class Running extends Workout {
  type = 'running';

  constructor(clickedPosition, distance, duration, cadence) {
    super(clickedPosition, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(clickedPosition, distance, duration, elevation) {
    super(clickedPosition, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// *** *** *** ***
// *** GET THE CURRENT LOCATION *** //

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get User's Position
    this._getCurrentLocation();

    // LOCAL STORAGE
    this._getLocalStorage();

    // *** *** EVENT HANDLERS *** *** //
    // Form Submit Handling
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Toggling between Cycling and Running
    inputType.addEventListener('change', this._toggleFormType);
    // To Move the map to the clicked list item's marker
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // To Remove the workout and its marker
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    // To Remove All
    removeAllButton.addEventListener(
      'click',
      this._deleteAllWorkouts.bind(this)
    );
  }

  _getCurrentLocation() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        (error) => console.error('Error getting position.', error)
      );
  }

  _loadMap(position) {
    if (!this.#map) {
      const { latitude, longitude } = position.coords;
      const coords = [latitude, longitude];

      // *** *** *** ***
      // *** LOAD THE MAP *** //
      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      // *** *** *** ***
      // *** ADD EVENT LISTENER TO MAP ***
      this.#map.on('click', (mapEvent) => this._showForm(mapEvent));
    }
  }

  _showForm(mapEvent) {
    this.#mapEvent = mapEvent;
    form.classList.toggle('hidden');
    inputDistance.focus;
  }

  _toggleFormType() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    // *** PREVENT SUBMIT REFRESH *** //
    event.preventDefault();

    // *** NECESSARY DATAS *** //
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const clickedPosition = [lat, lng];
    let workout;

    // *** VALIDATORS FOR FORM INPUT*** //
    const validInputs = (...inputs) => {
      inputs.every((input) => Number.isFinite(input));
    };

    const allPositive = (...inputs) => inputs.every((input) => input > 0);

    // *** RUNNING OR CYCLING CLASSES BASED ON TYPE *** //
    // *** IF TYPE IS RUNNING CREATE RUNNING OBJECT *** //
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Validate inputs
      if (
        !validInputs(distance, duration, cadence) &&
        !allPositive(distance, duration, cadence)
      )
        return console.error('running invalid');

      workout = new Running(clickedPosition, distance, duration, cadence);
    }

    // *** IF TYPE IS CYCLING CREATE RUNNING OBJECT *** //
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Validate inputs
      if (
        !validInputs(distance, duration, elevation) &&
        !allPositive(distance, duration)
      )
        return console.error('cycling invalid');

      workout = new Cycling(clickedPosition, distance, duration, elevation);
    }

    // *** PUSH THE NEWLY CREATED CYCLING OR RUNNING OBJECT TO THE WORKOUTS ARRAY *** //
    this.#workouts.push(workout);

    // *** SHOW MARKER ON CLICKED POSITION AFTER SUBMIT *** //
    this._renderWorkoutMarker(workout);
    // *** ADD THE NEW WORKOUT TO THE LIST AFTER SUBMIT *** //
    this._renderWorkoutListItem(workout);
    // *** CLEAR INPUT FIELDS AND HIDE FORM AFTER SUBMIT *** //
    this._hideAndClearForm();
    // *** LOCAL STORAGE FOR ALL WORKOUTS *** //
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.clickedPosition)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          closeButton: true,
          closeOnEscapeKey: true,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _deleteWorkout(event) {
    const button = event.target.closest('.remove-btn');
    if (!button) return;

    // Remove the list item
    const deleteTarget = button.closest('.workout');
    deleteTarget.remove();

    // Remove the marker from the map
    const deleteMarker = this.#workouts.find(
      (workout) => workout.id === deleteTarget.dataset.id
    );

    this.#map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const { lat, lng } = layer.getLatLng();
        if (
          deleteMarker &&
          deleteMarker.clickedPosition[0] === lat &&
          deleteMarker.clickedPosition[1] === lng
        ) {
          this.#map.removeLayer(layer);
        }
      }
    });

    // Remove the item from the workouts array
    this.#workouts = this.#workouts.filter(
      (workout) => workout.id !== deleteTarget.dataset.id
    );

    // Update local storage
    this._setLocalStorage();
  }

  _renderWorkoutListItem(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${
        workout.description
      }<button class="remove-btn">X</button></h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
    `;

    if (workout.type === 'cycling')
      html += `
     <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
        <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">m</span>
      </div>
   </li>
  
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(event) {
    const workoutListItem = event.target.closest('.workout');
    if (!workoutListItem) return;

    const workout = this.#workouts.find(
      (workout) => workout.id === workoutListItem.dataset.id
    );
    this.#map.setView(workout.clickedPosition, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _hideAndClearForm() {
    // *** CLEARING INPUT FIELDS *** //
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // *** HIDING FORM *** //
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => ((form.style.display = 'grid'), 1000));
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((workout) => {
      if (this.#map) {
        this._renderWorkoutListItem(workout);
        this._renderWorkoutMarker(workout);
      } else {
        this._loadMap({
          coords: {
            latitude: workout.clickedPosition[0],
            longitude: workout.clickedPosition[1],
          },
        });
      }
    });
  }
}
const app = new App();
