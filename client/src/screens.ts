export let screen = "connecting";
import { $ } from "./dom";

export const switchScreen = (screenName: string) => {
  if (screen === screenName) return;
  $("#screen-" + screen).style.display = "none";
  console.log(screen, "->", screenName);
  $("#screen-" + screenName).style.display = "";
	screen = screenName;	
};
