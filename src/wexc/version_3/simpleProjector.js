import { dom }           from "../../kolibri/util/dom.js";
import { DayController } from "./dayController.js";
import { timeStringToMinutes, totalMinutesToTimeString } from "./projectorUtils.js"

export { projectDay, projectWeek }

const projectWeek = (weekController, root) => {
    ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach( day => {
        const dayController = DayController();
        weekController.addDayController(dayController);
        projectDay(dayController, day, root);
    });
    // create view
    const [x1, x2, x3, totalElement] = dom(`
        <div>Total</div> <div> </div> <div> </div> <div><output>00:00</output></div>
    `);
    // data binding
    weekController.onTotalWeekMinutesChanged( mins => totalElement.firstElementChild.textContent = totalMinutesToTimeString(mins))
    // mount
    root.append(x1, x2, x3, totalElement);
}

const projectDay = (dayController, weekDay, root) => {
    // create view
    const [weekDayElement, amDiv, pmDiv, totalElement] = dom(`
        <div>${weekDay}</div>
        <div>
            <label for="${weekDay}_am_start">${weekDay} AM Start</label>
            <input type="time" id="${weekDay}_am_start" min="04:00" title="${weekDay} AM Start">
            <label for="${weekDay}_am_end">${weekDay} AM End</label>
            <input type="time" id="${weekDay}_am_end" title="${weekDay} AM End">
        </div>

        <div>
            <label for="${weekDay}_pm_start">${weekDay} PM Start</label>
            <input type="time" id="${weekDay}_pm_start" title="${weekDay} PM Start">
            <label for="${weekDay}_pm_end">${weekDay} PM End</label>
            <input type="time" id="${weekDay}_pm_end" max="22:00"  title="${weekDay} PM End">
        </div>  
        <div><output>00:00</output></div>
    `);
    const am_start = amDiv.querySelector(`#${weekDay}_am_start`);
    const am_end   = amDiv.querySelector(`#${weekDay}_am_end`);
    const pm_start = pmDiv.querySelector(`#${weekDay}_pm_start`);
    const pm_end   = pmDiv.querySelector(`#${weekDay}_pm_end`);

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
    dayController.onTotalChanged  ( mins => totalElement.firstElementChild.textContent = totalMinutesToTimeString(mins));

    const validVisualizer = element => valid => valid
        ? element.setCustomValidity("")  // this is one way of dealing with validity in the DOM
        : element.setCustomValidity("invalid");
    dayController.onAmStartValidChanged( validVisualizer(am_start));
    dayController.onAmEndValidChanged  ( validVisualizer(am_end  ));
    dayController.onPmStartValidChanged( validVisualizer(pm_start));
    dayController.onPmEndValidChanged  ( validVisualizer(pm_end  ));

    root.append(weekDayElement, amDiv, pmDiv, totalElement);
};
