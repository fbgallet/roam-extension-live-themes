import React from "react";
import { Tooltip as BpTooltip } from "@blueprintjs/core";

// Every Live Themes tooltip goes through this wrapper. Blueprint tooltips
// have no max-width, so a long content (a preset's full request, a rule's
// text) becomes one very wide box that leaves the viewport. `lt-tooltip`
// caps the width (see extension.css) and `boundary="viewport"` makes the
// popper flip or shift to stay on screen. `openOnTargetFocus` is off: when
// the dialog opens, Blueprint focuses its first button, whose tooltip would
// otherwise pop up by itself.
const Tooltip = ({ children, ...props }) => (
  <BpTooltip popoverClassName="lt-tooltip" boundary="viewport" hoverOpenDelay={400} openOnTargetFocus={false} {...props}>
    {children}
  </BpTooltip>
);

export default Tooltip;
