// formDataMiddleware.js
export async function formDataMiddleware(req, res) {
  const buffers = []

  // Lê todo o corpo da requisição
  for await (const chunk of req) {
    buffers.push(chunk)
  }

  const rawData = Buffer.concat(buffers).toString("binary")

  const contentType = req.headers["content-type"] || ""
  const boundaryMatch = contentType.match(/boundary=(.+)$/)
  if (!boundaryMatch) {
    req.body = {}
    req.files = []
    return
  }

  const boundary = "--" + boundaryMatch[1]
  const parts = rawData
    .split(boundary)
    .filter((part) => part.trim() !== "" && part.trim() !== "--")

  const body = {}
  const files = []

  for (let part of parts) {
    const [header, ...rest] = part.split("\r\n\r\n")
    const content = rest.join("\r\n\r\n").trimEnd()

    const nameMatch = header.match(/name="(.+?)"/)
    const filenameMatch = header.match(/filename="(.+?)"/)

    if (filenameMatch) {
      // Arquivo
      files.push({
        fieldname: nameMatch[1],
        originalname: filenameMatch[1],
        content: Buffer.from(content, "binary"),
      })
    } else if (nameMatch) {
      // Campo normal
      body[nameMatch[1]] = content
    }
  }

  req.files = files
}
