import {Attribute, VALUE, VALID} from "../../kolibri/presentationModel.js";

export { DayController }

// this is private and not exported since it is only to be used by the DayController
const DayModel = () => {
    const am_start = Attribute( 8 * 60); // value is minutes since midnight as Number
    const am_end   = Attribute(12 * 60);
    const pm_start = Attribute(13 * 60);
    const pm_end   = Attribute(17 * 60);
    const total    = Attribute(0);       // derived attribute

    const minMaxValues = mins => Math.max( 0, (Math.min(mins, 24 * 60)));
    [am_start, am_end, pm_start, pm_end].forEach( attr => attr.setConverter(minMaxValues));

    const updateTotal = _ => total.setConvertedValue(totalValue(am_start, am_end, pm_start, pm_end));
    [am_start, am_end, pm_start, pm_end].forEach( attr => attr.getObs(VALUE).onChange(updateTotal));

    return { am_start, am_end, pm_start, pm_end, total };
};

const DayController = () => {
    const { am_start, am_end, pm_start, pm_end, total } = DayModel();

    am_start.getObs(VALUE).onChange( sequenceRule(am_start, am_end));
    am_end  .getObs(VALUE).onChange( sequenceRule(am_start, am_end));
    pm_start.getObs(VALUE).onChange( sequenceRule(pm_start, pm_end));
    pm_end  .getObs(VALUE).onChange( sequenceRule(pm_start, pm_end));

    am_end  .getObs(VALUE).onChange( lunchBreakRule(am_end, pm_start));
    pm_start.getObs(VALUE).onChange( lunchBreakRule(am_end, pm_start));

    total   .getObs(VALUE).onChange( totalHoursRule(am_start, am_end, pm_start, pm_end));

    return {
        setAmStart       : am_start.setConvertedValue,
        setAmEnd         : am_end  .setConvertedValue,
        setPmStart       : pm_start.setConvertedValue,
        setPmEnd         : pm_end  .setConvertedValue,
        onAmStartChanged : am_start.getObs(VALUE).onChange,
        onAmEndChanged   : am_end  .getObs(VALUE).onChange,
        onPmStartChanged : pm_start.getObs(VALUE).onChange,
        onPmEndChanged   : pm_end  .getObs(VALUE).onChange,
        onTotalChanged   : total   .getObs(VALUE).onChange,
        getTotal         : total   .getObs(VALUE).getValue,
        onAmStartValidChanged : am_start.getObs(VALID).onChange,
        onAmEndValidChanged   : am_end  .getObs(VALID).onChange,
        onPmStartValidChanged : pm_start.getObs(VALID).onChange,
        onPmEndValidChanged   : pm_end  .getObs(VALID).onChange,
    }
};

const lunchBreakRule = (am_end, pm_start) => () => { // 40 min lunch break
    const amEndTime   = am_end.getObs(VALUE).getValue();
    const pmStartTime = pm_start.getObs(VALUE).getValue();

    if (pmStartTime - amEndTime >= 40) return; // it's all fine, nothing to do
    // otherwise move the pmStartTime back
    pm_start.setConvertedValue(amEndTime + 40); // Note: no more need to fire an event!
}

const sequenceRule = (startInput, endInput) => () => { // start must be <= end
    const start_total = startInput.getObs(VALUE).getValue();
    const end_total   = endInput.getObs(VALUE).getValue();

    if (start_total <= end_total) return ; // ok, we're fine
    // otherwise move the later time back
    endInput.setConvertedValue(start_total);
}

const totalHoursRule = (am_start, am_end, pm_start, pm_end) => totalVal => { // not more than 12 hours
    const isValid = totalVal <= 12 * 60;
    [am_start, am_end, pm_start, pm_end].forEach( attribute =>
        attribute.getObs(VALID).setValue(isValid));
}

const totalValue = (am_start, am_end, pm_start, pm_end) => {
    const am_start_total = am_start.getObs(VALUE).getValue();
    const am_end_total   = am_end  .getObs(VALUE).getValue();
    const pm_start_total = pm_start.getObs(VALUE).getValue();
    const pm_end_total   = pm_end  .getObs(VALUE).getValue();

    return am_end_total - am_start_total + pm_end_total - pm_start_total;
}
