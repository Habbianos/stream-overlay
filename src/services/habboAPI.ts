export const HOSTS = {
	us: 'www.habbo.com',
	br: 'www.habbo.com.br',
	es: 'www.habbo.es',
	nl: 'www.habbo.nl',
	de: 'www.habbo.de',
	fi: 'www.habbo.fi',
	tr: 'www.habbo.com.tr',
	it: 'www.habbo.it',
	fr: 'www.habbo.fr',
	s1: 's2.habbo.com',
	s2: 's2.habbo.com',
}

export async function fetchFigureString(options: { hotel: keyof typeof HOSTS, nick: string } | { figureString: string }, defaultLook: string = 'hd-99999-99999') {
	if ('figureString' in options) return { figureString: options.figureString }
	if (!(options.hotel in HOSTS)) return { figureString: defaultLook }

	return fetch(`https://${HOSTS[options.hotel]}/api/public/users?name=${options.nick}`)
		.then(r => r.json())
		.then(r => ({ figureString: r.figureString as string }))
		.catch(err => {
			console.error(err)

			// maybe fetch hotlooks https://www.habbo.com.br/api/public/lists/hotlooks

			return {
				figureString: defaultLook,
			}
		})
}
