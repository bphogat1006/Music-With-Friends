
/** @type {import('./$types').RequestHandler} */
export async function POST() {
    return new Response(null, {
        status: 200,
        headers: {
            'Set-Cookie': `session=deleted; Path=/; Max-Age=0; Secure; HttpOnly`
        }
    })
}