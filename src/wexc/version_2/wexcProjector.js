export {projectDay}

// Colors
let lightColor = '#ADCEFF';
let darkColor = '#4485E8';
let greenColor = '#90F0B6';
let redColor = '#F09090';
let whiteColor = '#FFF';
let greyColor = '#6D6D6D';
let clockFaceFill = '#ffffff';
let clockFaceShadow = '#a2a2a2';
let clockFaceStrokeStyleBold = '#000000';
let clockFaceStrokeStyleThin = '#6D6D6D';
let middlePointColor = '#606060';

const LabelTypes = {
    HOUR: "Hour",
    MINUTE: "Minute",
    HOUR_HIGHLIGHT: "Highlighted_Hour"
}

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

const createClock = (dayController, canvasId) => {
    // states
    let darkMode = Observable(false);
    let disabled = Observable(false);
    let invalid = Observable(false);

    // Positions & Sizes
    let outerArcWidth = 55;
    let handleWidth = 5;
    let handleLengthExtension = 8;
    let tolerance = 10;

    const mousePosition = {x: 0, y: 0};
    const nullvector = {x: 0, y: 0}

    let handles = [];
    let clickableHours = [];
    
    let selectedTimeWithHandle = {
        startHour: null,
        startMinute: null,
        endHour: null,
        endMinute: null
    }

    const clock = document.createElement('canvas');
    clock.id = canvasId;
    clock.width = 600;
    clock.height = 600;
    clock.style.backgroundColor = '#E5E5E5';
    clock.style.borderRadius = '5%';
    clock.style.fontFamily = 'Roboto';

    let cx = clock.getContext("2d");
    let centerX = clock.width / 2;
    let centerY = clock.height / 2;
    let radius = clock.width / 2 - outerArcWidth - 10;
    nullvector.x = clock.width / 2;

    clock.addEventListener("mouseup", _ => {
        // ignore all interaction if disabled
        if (disabled.getValue()) return;

        if (selectedTimeWithHandle.startHour === null && mouseOnHour(mousePosition) >= 0) {
            // first click on hourlabel -> set startHour
            selectedTimeWithHandle.startHour = mouseOnHour(mousePosition)
        } else if (selectedTimeWithHandle.endHour === null && mouseOnHour(mousePosition) >= 0) {
            // second click on hourlabel -> set endHour + show handle
            selectedTimeWithHandle.endHour = mouseOnHour(mousePosition)
            handles.push(new Handle("startMinute", clock.width / 2, 50, true, 2 * Math.PI, 200))
            console.log(handles)
        } else if (handles.length === 1 && downHandle != null) {
            // first handle set -> show second handle
            handles.push(new Handle("endMinute", clock.width / 2, 50, false, 2 * Math.PI, 200))
        } else if (mouseOnHour(mousePosition) > 0 && downHandle === null) {
            // click on hourlabel && no handle selected -> reset
            resetTime()
            selectedTimeWithHandle.startHour = mouseOnHour(mousePosition)
        }

        // set minutes according to handle position
        if (downHandle != null) {
            downHandle.angle = calcLineAngle(downHandle)
            downHandle = null
        }
    });

    clock.addEventListener("mousemove", e => {
        // ignore all interaction if disabled
        if (disabled.getValue()) return;

        // update MousePosition
        mousePosition.x = e.clientX;
        mousePosition.y = e.clientY;
        const positionOnCanvas = getMousePosOnCanvas(mousePosition)

        if (downHandle != null) {
            // calculate angle to mouse position
            let delta_x = positionOnCanvas.x - centerX
            let delta_y = centerY - positionOnCanvas.y

            let angle = Math.atan2(delta_x, delta_y)
            angle = angle <= 0 ? Math.PI * 2 + angle : angle; // convert negativ to positiv angle
            let minutes = timeForAngle(angle, true)

            // use angle of time to get snappy behavior for minute ticks
            let angleOfTime = angleForTime(0, minutes, true)
            downHandle.ex = downHandle.mx + downHandle.length * Math.cos(angleOfTime);
            downHandle.ey = downHandle.my + downHandle.length * Math.sin(angleOfTime);

            // set start or end minute
            if (downHandle.name === "startMinute") {
                selectedTimeWithHandle.startMinute = minutes;
            } else if (downHandle.name === "endMinute") {
                selectedTimeWithHandle.endMinute = minutes;
            }
        }
    });


    const resetColors = () => {
        const bdy = document.querySelector('body');
        const isDisabled = disabled.getValue();
        if (darkMode.getValue()) {
            bdy.dataset.theme = "dark";
            lightColor = isDisabled ? 'rgba(215,215,215,0.70)' : 'rgba(79,140,233,0.76)';
            darkColor = isDisabled ? '#828282' : '#005AAD';
            greenColor = isDisabled ? '#828282' : '#90F0B6';
            redColor = isDisabled ? '#828282' : '#F09090';
            whiteColor = '#FFF';
            greyColor = '#DDDDDD';
            clockFaceFill = '#575757';
            clockFaceShadow = invalid.getValue() ? '#FF0000' : '#575757';
            clockFaceStrokeStyleBold = '#FCFCFC';
            clockFaceStrokeStyleThin = '#EDEDED';
            middlePointColor = '#E1E1E1';
        } else {
            bdy.dataset.theme = "light";
            lightColor = isDisabled ? '#D8D8D8' : '#ADCEFF';
            darkColor = isDisabled ? '#A3A3A3' : '#4485E8';
            greenColor = isDisabled ? '#A3A3A3' : '#90F0B6';
            redColor = isDisabled ? '#A3A3A3' : '#F09090';
            whiteColor = '#FFF';
            greyColor = '#6D6D6D';
            clockFaceFill = '#FFFFFF';
            clockFaceShadow = invalid.getValue() ? '#FF0000' : '#a2a2a2';
            clockFaceStrokeStyleBold = '#000000';
            clockFaceStrokeStyleThin = '#6D6D6D';
            middlePointColor = '#606060';
        }
    }

    function getMousePosOnCanvas(coordinates) {
        let rect = clock.getBoundingClientRect();
        return {
            x: coordinates.x - rect.left,
            y: coordinates.y - rect.top
        };
    }

    function Handle(name, x, y, isStartHandle, angle, length) {
        this.name = name;
        this.ex = x;
        this.ey = y;
        this.mx = clock.width / 2
        this.my = clock.height / 2
        this.isStartHandle = isStartHandle;
        this.length = length;
    }

    const drawHandle = (handle) => {
        cx.beginPath();
        cx.lineWidth = handleWidth;
        cx.strokeStyle = handle.isStartHandle ? greenColor : redColor;
        cx.moveTo(handle.mx, handle.my);
        cx.lineTo(handle.ex, handle.ey);
        cx.stroke();
        cx.closePath();
    }

    const mouseNearHandle = (line, x, y) => {
        const lerp = (a, b, x) => (a + x * (b - a));
        let dx = line.mx - line.ex;
        let dy = line.my - line.ey;
        let t = ((x - line.ex) * dx + (y - line.ey) * dy) / (dx * dx + dy * dy);
        let lineX = lerp(line.ex, line.mx, t);
        let lineY = lerp(line.ey, line.my, t);
        return ({x: lineX, y: lineY});
    }

    const mouseOnHour = coordinates => {
        let tolerance = 20
        let clickOnCanvas = getMousePosOnCanvas(coordinates)
        let hourClicked = -1

        clickableHours.forEach((hourLabel, hour) => {
            let sx = hourLabel.x - tolerance
            let sy = hourLabel.y - tolerance
            let ex = hourLabel.x + tolerance
            let ey = hourLabel.y + tolerance

            if (clickOnCanvas.x >= sx && clickOnCanvas.x <= ex && clickOnCanvas.y >= sy && clickOnCanvas.y <= ey) {
                hourClicked = hour
            }
        })
        return hourClicked
    }

    let downHandle = null;

    function resetTime() {
        selectedTimeWithHandle.startHour = null
        selectedTimeWithHandle.startMinute = null
        selectedTimeWithHandle.endHour = null
        selectedTimeWithHandle.endMinute = null
        handles = []
    }

    clock.addEventListener("mousedown", e => {
        // ignore all interaction if disabled
        if (disabled.getValue()) return;

        // update MousePosition
        mousePosition.x = e.clientX;
        mousePosition.y = e.clientY;
        const positionOnCanvas = getMousePosOnCanvas(mousePosition)

        // Check if we are on a line and handle the line
        handles.forEach(h => {
            let linepoint = mouseNearHandle(h, positionOnCanvas.x, positionOnCanvas.y);
            let dx = positionOnCanvas.x - linepoint.x;
            let dy = positionOnCanvas.y - linepoint.y;
            let distance = Math.abs(Math.sqrt(dx * dx + dy * dy));
            if (distance < tolerance) {
                downHandle = h;
                h.clicked = true
            }
        });
    });


    const dotProduct = (ax, ay, bx, by) => ax * bx + ay * by
    const valueOfVector = (ax, ay) => Math.sqrt(ax ** 2 + ay ** 2);

    const calcLineAngle = handle => {
        return dotProduct(nullvector.x, nullvector.y, handle.ex, handle.ey) / (valueOfVector(nullvector.x, nullvector.y) * valueOfVector(handle.ex, handle.ey));
    }

    const none = (_) => false;

    const start = () => {
        nextClock()
        setInterval(() => {
            nextClock()
        }, 1000 / 20);
    }

    const nextClock = () => {
        cx.clearRect(0, 0, clock.width, clock.height)
        drawClockFace();

        const startHour = selectedTimeWithHandle.startHour;
        const startMinute = selectedTimeWithHandle.startMinute;
        const endHour = selectedTimeWithHandle.endHour;
        const endMinute = selectedTimeWithHandle.endMinute;

        drawOuterArc(startHour, startMinute, endHour, endMinute, lightColor, true);
        drawOuterArc(startHour, startMinute, endHour, endMinute, darkColor, false, true);
        drawInnerArc(startMinute, endMinute, lightColor, true)

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
        drawHighlightLabels(startHour, startMinute, endHour, endMinute, isInSlot)

        handles.forEach(h => {
            drawHandle(h)
        })

        drawMiddlePoint();
    }

    const getRadians = (degree) => (degree * Math.PI) / 180

    /**
     *
     * @param typeOfLabel
     * @param {function} isInSlot
     */

    const drawLabels = (typeOfLabel, isInSlot) => {
        let labelAngle = -90, labelRadius, fontSize, numOfLabels, increment, labelStart = 0, color = greyColor
        switch (typeOfLabel) {
            case LabelTypes.HOUR:
            case LabelTypes.HOUR_HIGHLIGHT:
                labelRadius = 235
                fontSize = 30
                numOfLabels = 24
                increment = 1
                break
            default: // aka LabelTypes.MINUTE
                labelRadius = 155
                fontSize = 18
                numOfLabels = 12
                increment = 5
        }

        if (typeOfLabel === LabelTypes.HOUR_HIGHLIGHT) color = whiteColor

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
                clickableHours[labelText] = {x: x + centerX - xCorrex, y: y + centerY - yCorrex}
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

    const drawClockFace = () => {
        // Weisse Scheibe
        cx.save();
        cx.fillStyle = clockFaceFill;
        cx.translate(centerX, centerY);
        cx.shadowColor = clockFaceShadow;
        cx.shadowBlur = 10;
        cx.shadowOffsetY = 0;
        cx.beginPath();
        cx.arc(0, 0, 270, 0, Math.PI * 2);
        cx.fill();
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
                cx.lineWidth = 3
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
        const totalMinutes = clockFaceMinutes ? minutes : (hours * 60 + minutes)
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

        return angle
    }

    const timeForAngle = (angle, clockFaceMinutes = false) => {
        let degree = angle * 180 / Math.PI
        let timePerDegree = clockFaceMinutes ? 360 / 60 : 360 / (24 * 60);

        return Math.round(degree / timePerDegree) % 60;
    }

    const drawLine = (angle, color, clockFaceMinutes = false) => {

        let innerRadius = radius - outerArcWidth
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

        if (fullHoursOnly) {
            let startFullHour = startMinute > 0 ? startHour + 1 : startHour;
            startAngle = angleForTime(startFullHour, 0);
            endAngle = angleForTime(endHour, 0);
        } else {
            startAngle = angleForTime(startHour, startMinute);
            endAngle = angleForTime(endHour, endMinute);
        }

        drawArc(startAngle, endAngle, color, false)

        if (drawLines) {
            drawLine(startAngle, greenColor)
            drawLine(endAngle, redColor);
        }
    }

    const drawInnerArc = (startMinute, endMinute, color) => {
        let startAngle = angleForTime(0, startMinute, true);
        let endAngle = angleForTime(0, endMinute, true);

        drawArc(startAngle, endAngle, color, true)
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


    /*
    /*
// dark mode
darModeCB.onchange = _ => darkMode.setValue(!darkMode.getValue());
darkMode.onChange(() => {
    resetColors();
});

// disabled
disabledCB.onchange = _ => disabled.setValue(!disabled.getValue());
disabled.onChange(() => {
    resetColors();
});

// invalid
invalidCB.onchange = _ => invalid.setValue(!invalid.getValue());
invalid.onChange(() => {
    resetColors();
});

*/


    //const am_start = amDiv.querySelector("#am_start");
    //const am_end = amDiv.querySelector("#am_end");
    //const pm_start = pmDiv.querySelector("#pm_start");
    //const pm_end = pmDiv.querySelector("#pm_end");

    // view binding: change in the view (by the user) -> change in the model
    //am_start.onchange = event => dayController.setAmStart(timeStringToMinutes(event.target.value));
    //am_end.onchange = event => dayController.setAmEnd(timeStringToMinutes(event.target.value));
    //pm_start.onchange = event => dayController.setPmStart(timeStringToMinutes(event.target.value));
    //pm_end.onchange = event => dayController.setPmEnd(timeStringToMinutes(event.target.value));

    // data binding: how to visualize changes in the model
    //dayController.onAmStartChanged(mins => am_start.value = totalMinutesToTimeString(mins));
    //dayController.onAmEndChanged(mins => am_end.value = totalMinutesToTimeString(mins));
    //dayController.onPmStartChanged(mins => pm_start.value = totalMinutesToTimeString(mins));
    //dayController.onPmEndChanged(mins => pm_end.value = totalMinutesToTimeString(mins));

    //const validVisualizer = element => valid => valid
    //    ? element.setCustomValidity("")  // this is one way of dealing with validity in the DOM
    //    : element.setCustomValidity("invalid");

    //dayController.onAmStartValidChanged(validVisualizer(am_start));
    //dayController.onAmEndValidChanged(validVisualizer(am_end));
    //dayController.onPmStartValidChanged(validVisualizer(pm_start));
    //dayController.onPmEndValidChanged(validVisualizer(pm_end));

    //root.appendChild(amDiv);
    //root.appendChild(pmDiv);


    start();

    return clock
}


const projectDay = (dayController, root) => {
    // create view
    const amClock = createClock(dayController, "amClockCanvas")
    root.appendChild(amClock);

    const pmClock = createClock(dayController, "pmClockCanvas")
    root.appendChild(pmClock);
};


const timeStringToMinutes = timeString => {
    if (!/\d\d:\d\d/.test(timeString)) return 0; // if we cannot parse the string to a time, assume 00:00
    const [hour, minute] = timeString.split(":").map(Number);
    return hour * 60 + minute;
}

const totalMinutesToTimeString = totalMinutes => {
    const hour = (totalMinutes / 60) | 0; // div
    const minute = totalMinutes % 60;
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}