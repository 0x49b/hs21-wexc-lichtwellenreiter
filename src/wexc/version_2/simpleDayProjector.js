import {dom} from "../../kolibri/util/dom.js";

export { projectDay }

const projectDay = (dayController, root) => {
    // create view
    const [amDiv, pmDiv] = dom(`
        <div>
            <label for="am_start">AM Start</label>
            <input type="time" id="am_start" min="04:00">
            until
            <label for="am_end">AM End</label>
            <input type="time" id="am_end">
        </div>

        <div>
            <label for="pm_start">PM Start</label>
            <input type="time" id="pm_start">
            until
            <label for="pm_end">PM End</label>
            <input type="time" id="pm_end" max="22:00">
        </div>  
    `);
    const am_start = amDiv.querySelector("#am_start");
    const am_end   = amDiv.querySelector("#am_end");
    const pm_start = pmDiv.querySelector("#pm_start");
    const pm_end   = pmDiv.querySelector("#pm_end");

    // view binding: change in the view (by the user) -> change in the model
    am_start.onchange = event => dayController.setAmStart(timeStringToMinutes(event.target.value));
    am_end  .onchange = event => dayController.setAmEnd  (timeStringToMinutes(event.target.value));
    pm_start.onchange = event => dayController.setPmStart(timeStringToMinutes(event.target.value));
    pm_end  .onchange = event => dayController.setPmEnd  (timeStringToMinutes(event.target.value));

    // data binding: how to visualize changes in the model
    dayController.onAmStartChanged( mins => am_start.value = totalMinutesToTimeString(mins));
    dayController.onAmEndChanged  ( mins => am_end  .value = totalMinutesToTimeString(mins));
    dayController.onPmStartChanged( mins => pm_start.value = totalMinutesToTimeString(mins));
    dayController.onPmEndChanged  ( mins => pm_end  .value = totalMinutesToTimeString(mins));

    const validVisualizer = element => valid => valid
        ? element.setCustomValidity("")  // this is one way of dealing with validity in the DOM
        : element.setCustomValidity("invalid");
    dayController.onAmStartValidChanged( validVisualizer(am_start));
    dayController.onAmEndValidChanged  ( validVisualizer(am_end  ));
    dayController.onPmStartValidChanged( validVisualizer(pm_start));
    dayController.onPmEndValidChanged  ( validVisualizer(pm_end  ));

    root.appendChild(amDiv);
    root.appendChild(pmDiv);
};

const timeStringToMinutes = timeString => {
    if( ! /\d\d:\d\d/.test(timeString)) return 0 ; // if we cannot parse the string to a time, assume 00:00
    const [hour, minute]  = timeString.split(":").map(Number);
    return hour * 60 + minute;
}

const totalMinutesToTimeString = totalMinutes => {
    const hour   = (totalMinutes / 60) | 0; // div
    const minute = totalMinutes % 60;
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}
