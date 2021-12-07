
import { projectWeek } from "./simpleProjector.js"
// todo: the string above   ^^^^^^^^^^^^^^^^^^^^^^    is the only thing that you are allowed to change !
// Note that in particular, controller (and thus model), business rules, and existing tests are not allowed to change.

import { WeekController } from "./weekController.js"

// closest to the using HTML is the only place where we depend on the HTML content
const workingHoursInput = document.getElementById("workingHoursInput");

const weekController = WeekController();

projectWeek(weekController, workingHoursInput);
