export const $ = <T extends HTMLElement>(query: string) => document.querySelector(query) as T;

export const $$ = <T extends HTMLElement>(query: string) => document.querySelectorAll(query) as NodeListOf<T>;

export const bindEnter = (name: string) => {
	$<HTMLInputElement>(`#input-${name}`).addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			$<HTMLButtonElement>(`#button-${name}`).click();
		}
	});
}