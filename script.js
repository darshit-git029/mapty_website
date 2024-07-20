'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = Date.now().toString();
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    // Sets the description of the workout based on type and date
    _setDescription() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    // Increases the click count of the workout
    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    // Calculates pace (min/km) based on distance and duration
    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    // Calculates speed (km/h) based on distance and duration
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();

        // Event listener for form submission
        form.addEventListener('submit', this._newWorkout.bind(this));
        // Event listener for toggling elevation/cadence input fields
        inputType.addEventListener('change', this._toggleElevationField);
        // Event listener for clicking on workouts list to move to popup on map
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        // Retrieves workouts from local storage when app initializes
        this._getlocalstorege();
    }

    // Gets current geolocation coordinates
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert('Could not find your location');
                }
            );
        }
    }

    // Loads map with current geolocation coordinates
    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        // Renders all stored workouts on the map when app initializes
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    // Shows the workout entry form on map click
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    // Hides the workout entry form
    _hideform() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = "none";
        form.classList.add('hidden');
        setTimeout(() => form.style.display = "grid", 1000);
    }

    // Toggles display of elevation or cadence input fields based on workout type
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    // Handles submission of new workout form
    _newWorkout(e) {
        e.preventDefault();

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        // Validates inputs and creates new Running or Cycling workout object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Inputs have to be positive numbers!');
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert('Inputs have to be positive numbers!');
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Adds the new workout to workouts array, renders it on map and list, hides form, and updates local storage
        this.#workouts.push(workout);
        this._renderWorkout(workout);
        this._renderWorkoutList(workout);
        this._hideform();
        this._setlocalstorge();

        form.reset();
    }

    // Renders a marker and popup for a workout on the map
    _renderWorkout(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    // Renders details of a workout in the workouts list
    _renderWorkoutList(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>`;

        // Appends additional details based on workout type (running or cycling)
        if (workout.type === 'running') {
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
                </div>`;
        }

        if (workout.type === 'cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>`;
        }

        html += `</li>`;
        containerWorkouts.insertAdjacentHTML('beforeend', html); // Inserts workout details into the workout list
    }

    // Moves map view to the clicked workout's location
    _moveToPopup(e) {
        const work = e.target.closest('.workout');
        if (!work) return;

        const workout = this.#workouts.find(workout => workout.id === work.dataset.id);
        if (!workout) return;

        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        workout.click(); // Increments click count on the clicked workout
    }

    // Stores workouts array in local storage
    _setlocalstorge() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    // Retrieves workouts array from local storage
    _getlocalstorege() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        if (data) {
            this.#workouts = data;
            this.#workouts.forEach(workout => {
                this._renderWorkoutList(workout);
            });
        }
    }

    // Clears local storage and reloads the page
    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    }
}

// Creates an instance of the App class to initialize the application
const app = new App();
