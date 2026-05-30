(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/rest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'messages',
                action: 'select',
                modifiers: [
                    { type: 'or', value: `sender_id.eq.admin123,receiver_id.eq.admin123` }
                ]
            })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
