// Тест API endpoint для жалоб

async function testReport() {
  try {
    const response = await fetch("http://localhost:8787/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host: "example.com",
        reportText: "Тестовая жалоба",
        verdict: "low",
        score: 10,
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", data);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testReport();
