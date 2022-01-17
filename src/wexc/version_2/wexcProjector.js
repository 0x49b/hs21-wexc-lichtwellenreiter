export {projectDay}

// colors
let lightColor = '#ADCEFF';
let darkColor = '#4485E8';
let greenColor = '#90F0B6';
let redColor = '#F09090';
let invalidColor = '#ff6262';
let invalidColorSecondary = '#ffbfbf';
let validatingColor = '#ffeca5';
let validColor = '#2379d3';
let whiteColor = '#FFF';
let greyColor = '#6D6D6D';
let greyColorAlternative = '#d3d3d3';
let clockFaceFill = '#ffffff';
let canvasColor = '#f6f6f6';
let clockFaceShadow = '#a2a2a2';
let clockFaceStrokeStyleBold = '#000000';
let clockFaceStrokeStyleThin = '#6D6D6D';
let middlePointColor = '#606060';

// preferences
const TOLERANCE = 20;
const minTime = "04:00";
const maxTime = "22:00";

// sizes
const outerArcWidth = 55;
const handleWidth = 5;
const handleLengthExtension = 8;

// types
const LabelTypes = {
    HOUR: "Hour",
    MINUTE: "Minute",
    HOUR_HIGHLIGHT: "Highlighted_Hour"
};

const HandleType = {
    START_HOUR: "startHour",
    START_MINUTE: "startMinute",
    END_HOUR: "endHour",
    END_MINUTE: "endMinute"
};

// observable objects
const Observable = value => {
    const listeners = []; // many
    return {
        onChange: callback => listeners.push(callback),
        getValue: () => value,
        setValue: val => {
            if (value === val) return; // protection
            // ordering
            value = val;
            listeners.forEach(notify => notify(val));
        }
    }
};

// misc.
const none = (_) => false;

const createClock = (dayController, canvasId, root) => {
    // states
    const darkMode = Observable(false);
    const disabled = Observable(false);
    const invalid = Observable(false);
    const required = Observable(false);
    const readOnly = Observable(false);

    let downHandle = null;

    const handleStates = {
        startHour: false,
        startMinute: false,
        endHour: false,
        endMinute: false
    }

    let timeSetInitially = false;
    const userInteractionFinished = _ => (
        handleStates.startHour
        && handleStates.startMinute
        && handleStates.endHour
        && handleStates.endMinute
        && downHandle === null
    )

    // positions & sizes
    const mousePosition = {x: 0, y: 0};
    const nullVector = {x: 0, y: 0};

    let handles = [];
    const clickableHours = [];

    // setup canvas
    const clock = document.createElement('canvas');
    clock.id = canvasId;
    clock.width = 600;
    clock.height = 600;
    clock.style.backgroundColor = canvasColor;
    clock.style.borderRadius = '2%';
    clock.style.fontFamily = 'Roboto';

    let cx = clock.getContext("2d");
    let centerX = clock.width / 2;
    let centerY = clock.height / 2;
    let radius = clock.width / 2 - outerArcWidth - 10;
    nullVector.x = clock.width / 2;

    // hidden input field representing time and states (e.g. 'read only')
    const start_time = hiddenInput('start');
    const end_time = hiddenInput('end');
    [start_time, end_time].forEach(input => clock.appendChild(input));
    [start_time, end_time].forEach(input => input.value = "00:00");

    const startListeners = [];
    const endListeners = [];

    // handle interactions
    clock.addEventListener("mouseup", _ => {
        // ignore all interaction if disabled
        if (disabled.getValue() || readOnly.getValue()) return;

        if (handleStates.startHour === false && mouseOnHour(mousePosition) >= 0) {
            // first click on hourlabel -> set startHour
            start_time.value = stringToTimeString(mouseOnHour(mousePosition) + ":" + timeStringToTime(start_time, true));
            handleStates.startHour = true;
        } else if (handleStates.endHour === false && mouseOnHour(mousePosition) >= 0) {
            // second click on hourlabel -> set endHour + show handle
            end_time.value = stringToTimeString(mouseOnHour(mousePosition) + ":" + timeStringToTime(end_time, true));
            handleStates.endHour = true;
            handles.push(new Handle("startMinute", clock.width / 2, 50, true, 2 * Math.PI, 200));
        } else if (handles.length === 1 && downHandle != null) {
            // first handle set -> show second handle
            handles.push(new Handle("endMinute", clock.width / 2, 50, false, 2 * Math.PI, 200));
        } else if (mouseOnHour(mousePosition) > 0 && downHandle === null) {
            // click on hourlabel && no handle selected -> reset
            resetTime();
            start_time.value = stringToTimeString(mouseOnHour(mousePosition) + ":" + timeStringToTime(start_time, true));
            handleStates.startHour = true;
        }

        checkValidity();

        // handle handle-moves
        if (downHandle != null) {
            // set minutes according to handle position
            downHandle.angle = calcLineAngle(downHandle);

            // fire event for new time (& interaction finished)
            if (handles.length === 2) {
                switch (downHandle.name) {
                    case "startMinute":
                        // no handle down anymore
                        downHandle = null;

                        if (timeSetInitially) {
                            startListeners.forEach(listener => listener(start_time.value));
                        }
                        break;
                    case "endMinute":
                        // no handle down anymore
                        downHandle = null;

                        if (!timeSetInitially) {
                            startListeners.forEach(listener => listener(start_time.value));
                            timeSetInitially = true;
                        }
                        endListeners.forEach(listener => listener(end_time.value));
                        break;
                }
            }
        }
    });

    clock.addEventListener("mousemove", e => {
        // ignore all interaction if disabled
        if (disabled.getValue() || readOnly.getValue()) return;

        // update MousePosition
        mousePosition.x = e.clientX;
        mousePosition.y = e.clientY;
        const positionOnCanvas = getMousePosOnCanvas(mousePosition);

        if (downHandle != null) {
            // calculate angle to mouse position
            const delta_x = positionOnCanvas.x - centerX;
            const delta_y = centerY - positionOnCanvas.y;

            let angle = Math.atan2(delta_x, delta_y);
            angle = angle <= 0 ? Math.PI * 2 + angle : angle; // convert negativ to positiv angle
            const minutes = timeForAngle(angle, true);

            // use angle of time to get snappy behavior for minute ticks
            const angleOfTime = angleForTime(0, minutes, true);
            downHandle.ex = downHandle.mx + downHandle.length * Math.cos(angleOfTime);
            downHandle.ey = downHandle.my + downHandle.length * Math.sin(angleOfTime);

            // set start or end minute
            if (downHandle.name === HandleType.START_MINUTE) {
                const currentHour = timeStringToTime(start_time.value);
                start_time.value = stringToTimeString(currentHour + ":" + minutes);
                handleStates.startMinute = true;
            } else if (downHandle.name === HandleType.END_MINUTE) {
                const currentHour = timeStringToTime(end_time.value);
                end_time.value = stringToTimeString(currentHour + ":" + minutes);
                handleStates.endMinute = true;
            }
        }
    });

    const resetColors = () => {
        const bdy = document.querySelector('body');
        const isDisabled = disabled.getValue();
        const isReadOnly = readOnly.getValue();
        if (darkMode.getValue()) {
            bdy.dataset.theme = "daletlightColor = isDisabled ? 'rgba(215,215,215,0.70)' : 'rgba(79,140,233,0.76)';";
            lightColor = isDisabled || isReadOnly  ? '#646464' : '#718394';
            darkColor = isDisabled || isReadOnly ? '#828282' : '#51adff';
            greenColor = isDisabled || isReadOnly  ? '#828282' : '#0d642b';
            redColor = isDisabled || isReadOnly  ? '#828282' : '#b75151';
            invalidColor = isDisabled || isReadOnly  ? '#a1a1a1' : '#ee3f3f';
            invalidColorSecondary = isDisabled || isReadOnly  ? '#d0d0d0' : '#e07e7e';
            whiteColor = '#000';
            greyColor = '#DDDDDD';
            clockFaceFill = '#575757';
            clockFaceShadow = invalid.getValue() ? invalidColor : '#575757';
            clockFaceStrokeStyleBold = '#FCFCFC';
            clockFaceStrokeStyleThin = '#EDEDED';
            middlePointColor = '#E1E1E1';
        } else {
            bdy.dataset.theme = "light";
            lightColor = isDisabled || isReadOnly  ? '#D8D8D8' : '#ADCEFF';
            darkColor = isDisabled || isReadOnly  ? '#A3A3A3' : '#4485E8';
            greenColor = isDisabled || isReadOnly  ? '#A3A3A3' : '#90F0B6';
            redColor = isDisabled || isReadOnly  ? '#A3A3A3' : '#F09090';
            invalidColor = isDisabled || isReadOnly  ? greyColor : '#ff6262';
            invalidColorSecondary = isDisabled || isReadOnly  ? greyColorAlternative : '#ffbfbf';
            whiteColor = '#FFF';
            greyColor = '#6D6D6D';
            clockFaceFill = '#FFFFFF';
            clockFaceShadow = invalid.getValue() ? invalidColor : '#a2a2a2';
            clockFaceStrokeStyleBold = '#000000';
            clockFaceStrokeStyleThin = '#6D6D6D';
            middlePointColor = '#606060';
        }
    }

    const checkValidity = _ => {
        const minMinutes = timeStringToMinutes(minTime);
        const maxMinutes = timeStringToMinutes(maxTime);
        const startMinutes = timeStringToMinutes(start_time.value);
        const endMinutes = timeStringToMinutes(end_time.value);

        if (minMinutes > startMinutes) {
            invalid.setValue(true);
            return;
        }
        if (maxMinutes < endMinutes) {
            invalid.setValue(true);
            return;
        }

        invalid.setValue(false);
    }

    const updateHandle = (handleType) => {
        let handle = null;
        let minutes = 0;

        // get current value for defined HandleType
        switch (handleType) {
            case HandleType.START_MINUTE:
                handle = handles.find(elm => elm.name === HandleType.START_MINUTE);
                minutes = timeStringToTime(start_time.value, true)
                break;
            case HandleType.END_MINUTE:
                handle = handles.find(elm => elm.name === HandleType.END_MINUTE);
                minutes = timeStringToTime(end_time.value, true)
                break;
        }

        // if handle not null, change position
        if (handle) {
            const angleOfTime = angleForTime(0, minutes, true);
            handle.ex = handle.mx + handle.length * Math.cos(angleOfTime);
            handle.ey = handle.my + handle.length * Math.sin(angleOfTime);
        }
    }

    function getMousePosOnCanvas(coordinates) {
        const rect = clock.getBoundingClientRect();
        return {
            x: coordinates.x - rect.left,
            y: coordinates.y - rect.top
        };
    }

    function Handle(name, x, y, isStartHandle, angle, length) {
        this.name = name;
        this.ex = x;
        this.ey = y;
        this.mx = clock.width / 2;
        this.my = clock.height / 2;
        this.isStartHandle = isStartHandle;
        this.length = length;
    }

    const drawHandle = (handle) => {
        cx.beginPath();
        cx.lineWidth = handleWidth;
        cx.strokeStyle = handle.isStartHandle ? greyColor : darkColor;
        cx.moveTo(handle.mx, handle.my);
        cx.lineTo(handle.ex, handle.ey);
        cx.stroke();
        cx.closePath();
    }

    const mouseNearHandle = (line, x, y) => {
        const lerp = (a, b, x) => (a + x * (b - a));
        const dx = line.mx - line.ex;
        const dy = line.my - line.ey;
        const t = ((x - line.ex) * dx + (y - line.ey) * dy) / (dx * dx + dy * dy);
        const lineX = lerp(line.ex, line.mx, t);
        const lineY = lerp(line.ey, line.my, t);
        return ({x: lineX, y: lineY});
    }

    const mouseOnHour = coordinates => {
        let tolerance = 20;
        let clickOnCanvas = getMousePosOnCanvas(coordinates);
        let hourClicked = -1;

        clickableHours.forEach((hourLabel, hour) => {
            let sx = hourLabel.x - tolerance;
            let sy = hourLabel.y - tolerance;
            let ex = hourLabel.x + tolerance;
            let ey = hourLabel.y + tolerance;

            if (clickOnCanvas.x >= sx && clickOnCanvas.x <= ex && clickOnCanvas.y >= sy && clickOnCanvas.y <= ey) {
                hourClicked = hour;
            }
        })
        return hourClicked;
    }

    function resetTime() {
        start_time.value = "00:00";
        end_time.value = "00:00";

        handleStates.startHour = false;
        handleStates.startMinute = false;
        handleStates.endHour = false;
        handleStates.endMinute = false;

        timeSetInitially = false;

        handles = [];
    }

    clock.addEventListener("mousedown", e => {
        // ignore all interaction if disabled
        if (disabled.getValue() || readOnly.getValue()) return;

        // update MousePosition
        mousePosition.x = e.clientX;
        mousePosition.y = e.clientY;
        const positionOnCanvas = getMousePosOnCanvas(mousePosition);

        // check if we are on a line and handle the line
        handles.forEach(h => {
            const linePoint = mouseNearHandle(h, positionOnCanvas.x, positionOnCanvas.y);
            const dx = positionOnCanvas.x - linePoint.x;
            const dy = positionOnCanvas.y - linePoint.y;
            const distance = Math.abs(Math.sqrt(dx * dx + dy * dy));
            if (distance < TOLERANCE) {
                downHandle = h;
                h.clicked = true;
            }
        });
    });

    const dotProduct = (ax, ay, bx, by) => ax * bx + ay * by;
    const valueOfVector = (ax, ay) => Math.sqrt(ax ** 2 + ay ** 2);

    const calcLineAngle = handle => {
        return dotProduct(nullVector.x, nullVector.y, handle.ex, handle.ey) / (valueOfVector(nullVector.x, nullVector.y) * valueOfVector(handle.ex, handle.ey));
    }

    const start = () => {
        nextClock();
        setInterval(() => {
            nextClock();
        }, 1000 / 20);
    }

    const nextClock = () => {
        cx.clearRect(0, 0, clock.width, clock.height);
        resetColors()
        drawClockFace();

        const startHour = timeStringToTime(start_time.value);
        const startMinute = timeStringToTime(start_time.value, true);
        const endHour = timeStringToTime(end_time.value);
        const endMinute = timeStringToTime(end_time.value, true);

        const clockEditable = !(disabled.getValue() || readOnly.getValue());

        drawOuterArc(startHour, startMinute, endHour, endMinute, lightColor, clockEditable);
        drawOuterArc(startHour, startMinute, endHour, endMinute, darkColor, false, true);
        drawInnerArc(startMinute, endMinute, lightColor);

        let isInSlot = (hour) => {
            if (!startHour) return false;
            if (!endHour && startHour === hour) return true; // only start hour selected
            if (!endHour) return false;
            if (hour === startHour && startMinute > 0) return false; // if start not 'xx:00'
            if (hour >= startHour && hour <= endHour) return true; // slot not passing '00:00' case 1
            if (endHour < startHour && hour <= endHour) return true; // slot passing '00:00' case 2
            if (endHour < startHour && hour >= startHour) return true; // slot passing '00:00' case 3
            return false;
        }
        drawLabels(LabelTypes.HOUR, isInSlot); // hour Labels
        drawLabels(LabelTypes.MINUTE, none); // minute Labels
        drawHighlightLabels(startHour, startMinute, endHour, endMinute, isInSlot);

        if (clockEditable) {
            handles.forEach(h => {
                drawHandle(h);
            });
        }

        drawMiddlePoint();
    }

    const getRadians = (degree) => (degree * Math.PI) / 180;

    const drawLabels = (typeOfLabel, isInSlot) => {
        let labelAngle = -90, labelRadius, fontSize, numOfLabels, increment, labelStart = 0, color = greyColor;
        switch (typeOfLabel) {
            case LabelTypes.HOUR:
            case LabelTypes.HOUR_HIGHLIGHT:
                labelRadius = 235;
                fontSize = 30;
                numOfLabels = 24;
                increment = 1;
                break;
            default: // aka LabelTypes.MINUTE
                labelRadius = 155;
                fontSize = 18;
                numOfLabels = 12;
                increment = 5;
        }

        if (typeOfLabel === LabelTypes.HOUR_HIGHLIGHT) color = whiteColor;

        const xCorrex = -(fontSize / 2); // Because of the FontSize to position it correct over the Strokes
        const yCorrex = (fontSize / 3);
        let labelText = labelStart;
        const angleBetweenLabels = (360 / numOfLabels); // 360 degree / number of labels

        for (let i = 0; i < numOfLabels; i++) {
            cx.save();
            cx.translate(centerX, centerY);
            cx.fillStyle = color;
            if (isInSlot(i)) {
                cx.font = '700 ' + fontSize + 'px Roboto';
            } else {
                cx.font = '300 ' + fontSize + 'px Roboto';
            }
            let x = labelRadius * Math.cos(getRadians(labelAngle + (angleBetweenLabels * i))) + xCorrex;
            let y = labelRadius * Math.sin(getRadians(labelAngle + (angleBetweenLabels * i))) + yCorrex;

            // save position of hour label
            if (typeOfLabel === LabelTypes.HOUR) {
                clickableHours[labelText] = {x: x + centerX - xCorrex, y: y + centerY - yCorrex};
            }

            let text = (labelText.toString().length === 1) ? ` ${labelText}` : labelText;
            cx.fillText(text, x, y); // Text
            cx.restore();

            labelText += increment;
        }
    }

    function drawHighlightLabels(startHour, startMinute, endHour, endMinute, isInSlot) {
        if (!startHour || !endHour) return;

        let startAngle = angleForTime(startHour, startMinute);
        let endAngle = angleForTime(endHour, endMinute);
        clipArc(startAngle, endAngle);

        drawLabels(LabelTypes.HOUR_HIGHLIGHT, isInSlot); // highlighted hour Labels

        cx.restore();

    }

    const validationColor = _ => {
        if (invalid.getValue()) {
            return invalidColor;
        } else if (required.getValue() && !userInteractionFinished()) {
            return validatingColor;
        } else {
            return required.getValue() ? validColor : "transparent";
        }
    }

    const drawClockFace = () => {
        // Weisse Scheibe
        cx.save();
        cx.fillStyle = clockFaceFill;
        cx.strokeStyle = validationColor();
        cx.lineWidth = 4;
        cx.translate(centerX, centerY);
        cx.shadowColor = clockFaceShadow;
        cx.shadowBlur = 10;
        cx.shadowOffsetY = 0;
        cx.beginPath();
        cx.arc(0, 0, 270, 0, Math.PI * 2);
        cx.fill();
        cx.stroke();
        cx.closePath();
        cx.restore();

        // Stroke - Skala
        for (let i = 0; i < 60; i++) {
            cx.save();
            cx.translate(centerX, centerY);
            cx.rotate(i * (Math.PI / 30));
            cx.beginPath();
            cx.moveTo(0, -190);
            cx.lineTo(0, -200);

            if (i % 5 === 0) {
                cx.strokeStyle = clockFaceStrokeStyleBold;
                cx.lineWidth = 3;
            } else {
                cx.strokeStyle = clockFaceStrokeStyleThin;
                cx.lineWidth = 1;
            }
            cx.stroke();
            cx.closePath();
            cx.restore();
        }
    }

    const drawMiddlePoint = () => {
        // Punkt in der Mitte
        cx.fillStyle = middlePointColor;
        cx.save();
        cx.translate(centerX, centerY);
        cx.beginPath();
        cx.arc(0, 0, 6, 0, Math.PI * 2);
        cx.closePath();
        cx.fill();
        cx.closePath();
        cx.restore();
    }

    /**
     * @param {number} hours
     * @param {number} minutes
     * @param {boolean} clockFaceMinutes – if true, the calculated angle applies to a clock face with minutes only.
     */

    const angleForTime = (hours, minutes, clockFaceMinutes = false) => {
        const fullCircleAngle = 2 * Math.PI;
        const totalMinutes = clockFaceMinutes ? minutes : (hours * 60 + minutes);
        let angleOfMinute;

        if (clockFaceMinutes) {
            angleOfMinute = fullCircleAngle / 60;
        } else {
            angleOfMinute = fullCircleAngle / (24 * 60);
        }

        let angle = totalMinutes * angleOfMinute;

        // move start of 0° to top
        let angle45Degree = 0.5 * Math.PI;
        angle -= angle45Degree;

        return angle;
    }

    const timeForAngle = (angle, clockFaceMinutes = false) => {
        let degree = angle * 180 / Math.PI;
        let timePerDegree = clockFaceMinutes ? 360 / 60 : 360 / (24 * 60);

        return Math.round(degree / timePerDegree) % 60;
    }

    const drawLine = (angle, color, clockFaceMinutes = false) => {

        let innerRadius = radius - outerArcWidth;
        let handleLength = outerArcWidth + (2 * handleLengthExtension);

        cx.beginPath();

        if (clockFaceMinutes) {
            let startX = (innerRadius + handleLengthExtension) * Math.cos(angle) + centerX;
            let startY = (innerRadius + handleLengthExtension) * Math.sin(angle) + centerY;

            cx.moveTo(startX, startY);
            cx.lineTo(centerX, centerY);

        } else {
            let startX = (radius - handleLength / 2) * Math.cos(angle) + centerX;
            let startY = (radius - handleLength / 2) * Math.sin(angle) + centerY;

            let endX = (radius + handleLength / 2) * Math.cos(angle) + centerX;
            let endY = (radius + handleLength / 2) * Math.sin(angle) + centerY;

            cx.moveTo(startX, startY);
            cx.lineTo(endX, endY);
        }
        cx.lineWidth = handleWidth;
        cx.strokeStyle = color;
        cx.stroke();

    }

    const drawOuterArc = (startHour, startMinute, endHour, endMinute, color, drawLines = false, fullHoursOnly = false) => {
        if (!startHour || !endHour) return;

        let startAngle;
        let endAngle;
        let startInvalidAngle = null;
        let endInvalidAngle = null;

        if (fullHoursOnly) {
            let startFullHour = startMinute > 0 ? startHour + 1 : startHour;

            // invalid time
            if (timeStringToMinutes(stringToTimeString(startFullHour+ ":00")) < timeStringToMinutes(minTime)) {
                startAngle = angleForTime(minTime.split(":").map(Number)[0], 0);
                endAngle = angleForTime(endHour, 0);

                startInvalidAngle = angleForTime(startFullHour, 0);
                endInvalidAngle = angleForTime(minTime.split(":").map(Number)[0], 0);
            } else if (timeStringToMinutes(stringToTimeString(endHour + ":00")) > timeStringToMinutes(maxTime)) {
                startAngle = angleForTime(startFullHour, 0);
                endAngle = angleForTime(maxTime.split(":").map(Number)[0], 0);

                startInvalidAngle = angleForTime(maxTime.split(":").map(Number)[0], 0);
                endInvalidAngle = angleForTime(endHour, 0);
            } else {
                // valid time
                startAngle = angleForTime(startFullHour, 0);
                endAngle = angleForTime(endHour, 0);
            }

            drawArc(startAngle, endAngle, color, false);
            if (startInvalidAngle !== null) drawArc(startInvalidAngle, endInvalidAngle, invalidColor, false);

        } else {

            // invalid time
            if (timeStringToMinutes(stringToTimeString(startHour + ":" + startMinute)) < timeStringToMinutes(minTime)) {
                startAngle = angleForTime(minTime.split(":").map(Number)[0], minTime.split(":").map(Number)[1]);
                endAngle = angleForTime(endHour, endMinute);

                startInvalidAngle = angleForTime(startHour, startMinute);
                endInvalidAngle = angleForTime(minTime.split(":").map(Number)[0], minTime.split(":").map(Number)[1]);
            } else if (timeStringToMinutes(endHour + endMinute) > timeStringToMinutes(maxTime)) {
                startAngle = angleForTime(startHour, startMinute);
                endAngle = angleForTime(maxTime.split(":").map(Number)[0], maxTime.split(":").map(Number)[1]);

                startInvalidAngle = angleForTime(maxTime.split(":").map(Number)[0], maxTime.split(":").map(Number)[1]);
                endInvalidAngle = angleForTime(endHour, endMinute);
            } else {
                startAngle = angleForTime(startHour, startMinute);
                endAngle = angleForTime(endHour, endMinute);
            }

            drawArc(startAngle, endAngle, color, false);
            if (startInvalidAngle !== null) drawArc(startInvalidAngle, endInvalidAngle, invalidColorSecondary, false);
        }

        if (drawLines) {
            const startInvalid = startInvalidAngle < startAngle;
            const endInvalid = endInvalidAngle > endAngle;
            startAngle = startInvalid ? startInvalidAngle : startAngle;
            endAngle = endInvalid ? endInvalidAngle : endAngle;
            drawLine(startAngle, startInvalid ? invalidColor : greyColor);
            drawLine(endAngle, endInvalid ? invalidColor : darkColor);
        }

    }

    const drawInnerArc = (startMinute, endMinute, color) => {
        let startAngle = angleForTime(0, startMinute, true);
        let endAngle = angleForTime(0, endMinute, true);

        drawArc(startAngle, endAngle, color, true);
    }

    const drawArc = (startAngle, endAngle, color, drawInner = false) => {
        cx.save();
        cx.beginPath();
        if (drawInner) {
            // inner
            cx.moveTo(centerX, centerY);
            cx.arc(centerX, centerY, radius - outerArcWidth, startAngle, endAngle);
            cx.fillStyle = color;
            cx.fill();
        } else {
            // outer
            cx.arc(centerX, centerY, radius, startAngle, endAngle);
            cx.lineWidth = outerArcWidth;
            cx.strokeStyle = color;
            cx.stroke();
        }
        cx.restore();
    }

    const clipArc = (startAngle, endAngle) => {
        cx.save();
        cx.beginPath();

        cx.moveTo(centerX, centerY);
        cx.arc(centerX, centerY, radius + outerArcWidth, startAngle, endAngle);

        cx.clip();
    }


    // observer for mutations of states
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            switch (mutation.attributeName) {
                case "readonly":
                    readOnly.setValue(!readOnly.getValue())
                    break;
                case "required":
                    required.setValue(!required.getValue())
                    break;
                case "disabled":
                    disabled.setValue(!disabled.getValue())
                    break;
            }
        });
    });

    // observe hidden hiddenInput field for state changes
    observer.observe(start_time, {
        attributes: true
    });
    observer.observe(root, {
        attributes: true
    });

    const doc = document.querySelector('html');
    let prevClassState = doc.classList.contains('darkTheme');
    const observer2 = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if(mutation.attributeName === "class"){
                const currentClassState = mutation.target.classList.contains('darkTheme');
                if(prevClassState !== currentClassState)    {
                    prevClassState = currentClassState;
                    if(currentClassState)
                        darkMode.setValue(true)
                    else
                        darkMode.setValue(false)
                }
            }
        });
    });
    observer2.observe(doc, {attributes: true});

    start();

    return {
        clock: clock,
        start_field: start_time,
        end_field: end_time,
        setStart: newValue => {
            if (userInteractionFinished()) {
                start_time.value = newValue;
                if (timeStringToMinutes(start_time.value) >= timeStringToMinutes(end_time.value)) {
                    end_time.value = stringToTimeString((
                        end_time.value.split(":").map(Number)[0] + 2) + ":00")
                }
                updateHandle(HandleType.START_MINUTE);
            }
        },
        setEnd: newValue => {
            if (userInteractionFinished()) {
                end_time.value = newValue;
                if (timeStringToMinutes(start_time.value) >= timeStringToMinutes(end_time.value)) {
                    end_time.value = stringToTimeString((
                        end_time.value.split(":").map(Number)[0] + 2) + ":00")
                }
                updateHandle(HandleType.END_MINUTE);
            }
        },
        startOnChange: callback => startListeners.push(callback),
        endOnChange: callback => endListeners.push(callback),
        setInvalid: isInvalid => invalid.setValue(isInvalid)
    };
}

const projectDay = (dayController, root) => {
    // generate clocks
    const amClock = createClock(dayController, "amClockCanvas", root);
    const pmClock = createClock(dayController, "pmClockCanvas", root);

    // view binding: change in the view (by the user) -> change in the model
    amClock.startOnChange(newTime => {
        dayController.setAmStart(timeStringToMinutes(newTime));
    });

    amClock.endOnChange(newTime => {
        dayController.setAmEnd(timeStringToMinutes(newTime));
    });

    pmClock.startOnChange(newTime => {
        dayController.setPmStart(timeStringToMinutes(newTime));
    });

    pmClock.endOnChange(newTime => {
        dayController.setPmEnd(timeStringToMinutes(newTime));
    });

    // data binding: how to visualize changes in the model
    dayController.onAmStartChanged(mins => {
        let newTime = totalMinutesToTimeString(mins);
        amClock.setStart(newTime);
    });

    dayController.onAmEndChanged(mins => {
        let newTime = totalMinutesToTimeString(mins);
        amClock.setEnd(newTime);
    });

    dayController.onPmStartChanged(mins => {
        let newTime = totalMinutesToTimeString(mins);
        pmClock.setStart(newTime);
    });

    dayController.onPmEndChanged(mins => {
        let newTime = totalMinutesToTimeString(mins);
        pmClock.setEnd(newTime);
    });

    const validVisualizer = clock => valid => valid
        ? clock.setInvalid(false) // this is one way of dealing with validity in the DOM
        : clock.setInvalid(true);

    dayController.onAmStartValidChanged(validVisualizer(amClock));
    dayController.onAmEndValidChanged(validVisualizer(amClock));
    dayController.onPmStartValidChanged(validVisualizer(pmClock));
    dayController.onPmEndValidChanged(validVisualizer(pmClock));

    // add clocks to DOM
    root.appendChild(amClock.clock);
    root.appendChild(pmClock.clock);
};

const timeStringToMinutes = timeString => {
    if (!/\d\d:\d\d/.test(timeString)) return 0; // if we cannot parse the string to a time, assume 00:00
    const [hour, minute] = timeString.split(":").map(Number);
    return hour * 60 + minute;
}

const timeStringToTime = (timeString, minutes = false) => {
    if (!/\d\d:\d\d/.test(timeString)) return 0; // if we cannot parse the string to a time, assume 00:00
    const [hour, minute] = timeString.split(":").map(Number);
    return minutes ? minute : hour;
}

const hiddenInput = (name) => {
    const hiddenInput = document.createElement('input');
    hiddenInput.setAttribute('type', 'hidden')
    hiddenInput.setAttribute('id', `hidden-input-${name}`)
    return hiddenInput
}

const totalMinutesToTimeString = totalMinutes => {
    const hour = (totalMinutes / 60) | 0; // div
    const minute = totalMinutes % 60;
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

const stringToTimeString = (string) => {
    const [hour, minute] = string.split(":").map(String);
    const newHour = hour.length < 2 ? "0" + hour : hour
    const newMinute = minute.length < 2 ? "0" + minute : minute
    return newHour + ":" + newMinute;
}