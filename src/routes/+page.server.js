import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
    if (!locals.valid) {
        throw redirect(307, '/login');
    }
}