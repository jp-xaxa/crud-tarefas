import { randomUUID } from "node:crypto"
import { Database } from "./database.js"
import { buildRoutePath } from "./utils/build-route-path.js"
import { getDataHoraAtual } from "./utils/getHoursAndDate.js"

import { Readable, Transform } from "node:stream"

const database = new Database()

export const routes = [
  {
    method: "POST",
    path: buildRoutePath("/tasks"),
    handler: (req, res) => {
      const { title, description } = req.body

      const task = {
        id: randomUUID(),
        title,
        description,
        completed_at: null,
        created_at: getDataHoraAtual(),
        updated_at: getDataHoraAtual(),
      }

      database.insert("tasks", task)

      return res.writeHead(201).end()
    },
  },
  {
    method: "GET",
    path: buildRoutePath("/tasks"),
    handler: (req, res) => {
      const { search } = req.query

      const tasks = database.select(
        "tasks",
        search
          ? {
              title: search,
              description: search,
            }
          : null
      )

      return res.end(JSON.stringify(tasks))
    },
  },
  {
    method: "PUT",
    path: buildRoutePath("/tasks/:id"),
    handler: (req, res) => {
      const { id } = req.params
      const { title, description } = req.body

      const task = database.select("tasks").find((task) => task.id === id)

      if (!task) {
        return res
          .writeHead(404)
          .end(JSON.stringify({ error: "Tarefa não encontrada pelo ID!" }))
      }

      if (!title && !description) {
        return res.writeHead(400).end(
          JSON.stringify({
            error: "Não foi passado nenhuma informação nova para atualizar.",
          })
        )
      }

      database.update("tasks", id, {
        title: title ?? task.title,
        description: description ?? task.description,
        completed_at: task.completed_at,
        created_at: task.created_at,
        updated_at: getDataHoraAtual(),
      })

      return res.writeHead(204).end()
    },
  },
  {
    method: "DELETE",
    path: buildRoutePath("/tasks/:id"),
    handler: (req, res) => {
      const { id } = req.params

      const task = database.select("tasks").find((task) => task.id === id)

      if (!task) {
        return res
          .writeHead(404)
          .end(JSON.stringify({ error: "Tarefa não encontrada pelo ID!" }))
      }

      database.delete("tasks", id)

      return res.writeHead(204).end()
    },
  },
  {
    method: "PATCH",
    path: buildRoutePath("/tasks/:id"),
    handler: (req, res) => {
      const { id } = req.params
      const { completed_at } = req.body

      const task = database.select("tasks").find((task) => task.id === id)

      if (!task) {
        return res
          .writeHead(404)
          .end(JSON.stringify({ error: "Tarefa não encontrada pelo ID!" }))
      }

      if (!completed_at) {
        return res.writeHead(400).end(
          JSON.stringify({
            error: "A informação obrigatoria não foi passada.",
          })
        )
      }

      database.update("tasks", id, {
        title: task.title,
        description: task.description,
        completed_at: completed_at,
        created_at: task.created_at,
        updated_at: getDataHoraAtual(),
      })

      return res.writeHead(204).end()
    },
  },
  {
    method: "POST",
    path: buildRoutePath("/import-file"),
    handler: async (req, res) => {
      const file = req.files[0]
      if (!file) {
        return res
          .writeHead(400)
          .end(JSON.stringify({ error: "Nenhum arquivo enviado" }))
      }

      const fileStream = Readable.from(file.content)

      let isFirstLine = true

      const lineProcessor = new Transform({
        readableObjectMode: true,
        transform(chunk, encoding, callback) {
          const lines = chunk.toString().split("\n")

          for (let line of lines) {
            line = line.trim()
            if (!line) continue

            if (isFirstLine) {
              isFirstLine = false
              continue
            }

            const [title, description] = line.split(";")

            if (title) {
              this.push({
                title: title.trim(),
                description: (description || "").trim(),
              })
            }
          }

          callback()
        },
      })

      fileStream
        .pipe(lineProcessor)
        .on("data", (task) => {
          const newTask = {
            id: randomUUID(),
            title: task.title,
            description: task.description,
            completed_at: null,
            created_at: getDataHoraAtual(),
            updated_at: getDataHoraAtual(),
          }

          database.insert("tasks", newTask)
        })
        .on("end", () => {
          res
            .writeHead(200, { "Content-Type": "application/json" })
            .end(JSON.stringify({ message: "Arquivo todo processado" }))
        })
        .on("error", (err) => {
          console.error(err)
          res
            .writeHead(500)
            .end(JSON.stringify({ error: "Erro ao processar arquivo" }))
        })
    },
  },
]
