
import { total }     from "./kolibri/util/test.js";
import {versionInfo} from "./kolibri/version.js";

import '../src/kolibri/allKolibriTestsSuite.js';

import '../src/wexc/version_2/dayControllerTest.js'
import '../src/wexc/version_3/dayControllerTest.js'
import '../src/wexc/version_3/weekControllerTest.js'
import '../src/wexc/version_3/projectorUtilsTest.js'
import '../src/wexc/version_3/simpleProjectorTest.js'


document.getElementById('grossTotal').textContent = "" + total + " Tests";

document.querySelector("footer").textContent = "Built with Kolibri " + versionInfo;
