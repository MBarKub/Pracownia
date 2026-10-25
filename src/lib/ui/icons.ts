// Ścieżki ikon przeniesione z Pracowni v4 (24×24, obrys)
export const PATHS = {
	home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
	tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
	folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
	note: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
	plus: 'M12 5v14M5 12h14',
	search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4',
	palette:
		'M12 3a9 9 0 1 0 0 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
	sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
	x: 'M6 6l12 12M18 6 6 18',
	trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
	calendar:
		'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2v4M16 2v4',
	flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
	check: 'M5 12.5l4.5 4.5L19 7',
	grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
	left: 'M15 6l-6 6 6 6',
	pin: 'M9 4h6l-1 6 4 3H6l4-3zM12 13v8',
	list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
	board: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z',
	more: 'M5 12h.01M12 12h.01M19 12h.01',
	down: 'M12 4v11M7 10l5 5 5-5M5 20h14',
	up: 'M12 20V9M7 14l5-5 5 5M5 4h14',
	bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
	arrow: 'M5 12h14M13 6l6 6-6 6',
	sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
	clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
	play: 'M8 5.5v13l10.5-6.5z',
	stop: 'M7 7h10v10H7z',
	pdf: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 17h8M8 13h5'
} as const;
export type IconName = keyof typeof PATHS;
