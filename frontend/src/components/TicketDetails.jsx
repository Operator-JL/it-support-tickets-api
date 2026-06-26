import { MessageSquare, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { addComment, getComments, isSessionError, updateTicket } from "../services/api.js";
import { getSocket } from "../services/socket.js";

const priorities = ["Baja", "Media", "Alta", "Urgente"];
const inputClass =
  "rounded-xl border border-slate-200 px-4 py-3 outline-none ring-orange-100 transition focus:border-orange-500 focus:ring-4";

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TicketDetails({ ticket, token, user, onClose, onSaved, onUnauthorized }) {
  const role = String(user?.role || "").toLowerCase();
  const canSupport = ["soporte", "it", "admin"].includes(role);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [edit, setEdit] = useState(ticket);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addCommentToState = useCallback((nextComment) => {
    setComments((current) => {
      const alreadyExists = current.some(
        (comment) => Number(comment.id) === Number(nextComment.id)
      );

      return alreadyExists ? current : [...current, nextComment];
    });
  }, []);

  useEffect(() => {
    let active = true;
    setEdit(ticket);
    setNewComment("");
    setError("");

    async function loadComments() {
      setLoading(true);
      try {
        const data = await getComments(token, ticket.id);
        if (active) {
          setComments(Array.isArray(data.comments) ? data.comments : []);
        }
      } catch (loadError) {
        if (isSessionError(loadError) && onUnauthorized) {
          onUnauthorized();
          return;
        }

        if (active) {
          setError(loadError.message || "No se pudieron cargar los comentarios.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadComments();
    return () => {
      active = false;
    };
  }, [onUnauthorized, ticket, token]);

  useEffect(() => {
    let isActive = true;
    let socketConnection = null;
    const ticketId = Number(ticket.id);
    const handleCommentCreated = (payload = {}) => {
      if (Number(payload.ticketId) !== ticketId || !payload.comment) {
        return;
      }

      addCommentToState(payload.comment);
    };
    const handleTicketStatusUpdated = (payload = {}) => {
      const nextTicket = payload.ticket;

      if (!nextTicket || Number(nextTicket.id) !== ticketId) {
        return;
      }

      setEdit(nextTicket);
      onSaved(nextTicket);
    };

    getSocket(token)
      .then((socket) => {
        if (!isActive) {
          return;
        }

        socketConnection = socket;
        socket.on("comment:created", handleCommentCreated);
        socket.on("ticket:status-updated", handleTicketStatusUpdated);
      })
      .catch(() => {});

    return () => {
      isActive = false;

      if (socketConnection) {
        socketConnection.off("comment:created", handleCommentCreated);
        socketConnection.off("ticket:status-updated", handleTicketStatusUpdated);
      }
    };
  }, [addCommentToState, onSaved, ticket.id, token]);

  function update(field, value) {
    setEdit((current) => ({ ...current, [field]: value }));
  }

  async function saveTicket(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const data = await updateTicket(token, ticket.id, {
        title: edit.title,
        description: edit.description,
        category: edit.category,
        priority: edit.priority,
      });
      setEdit(data.ticket);
      onSaved(data.ticket);
    } catch (saveError) {
      if (isSessionError(saveError) && onUnauthorized) {
        onUnauthorized();
        return;
      }

      setError(saveError.message || "No se pudo actualizar el ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function sendComment(event) {
    event.preventDefault();
    const cleanComment = newComment.trim();
    if (!cleanComment) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const data = await addComment(token, ticket.id, cleanComment);
      addCommentToState(data.comment);
      setNewComment("");
    } catch (commentError) {
      if (isSessionError(commentError) && onUnauthorized) {
        onUnauthorized();
        return;
      }

      setError(commentError.message || "No se pudo agregar el comentario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <aside className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-sm font-black uppercase text-orange-600">
              Ticket #{ticket.id}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {ticket.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Creado: {formatDate(ticket.created_at)}
            </p>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            onClick={onClose}
            type="button"
            aria-label="Cerrar detalle"
          >
            <X size={20} />
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto p-6">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}

          {canSupport ? (
            <form
              className="grid gap-3 rounded-2xl border border-slate-200 p-4"
              onSubmit={saveTicket}
            >
              <h3 className="font-black text-slate-950">Editar ticket</h3>
              <input
                className={inputClass}
                disabled={saving}
                onChange={(event) => update("title", event.target.value)}
                required
                value={edit.title || ""}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClass}
                  disabled={saving}
                  onChange={(event) => update("category", event.target.value)}
                  required
                  value={edit.category || ""}
                />
                <select
                  className={inputClass}
                  disabled={saving}
                  onChange={(event) => update("priority", event.target.value)}
                  value={edit.priority || "Media"}
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <textarea
                className={`${inputClass} min-h-28`}
                disabled={saving}
                onChange={(event) => update("description", event.target.value)}
                required
                value={edit.description || ""}
              />
              <button
                className="w-fit rounded-xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-orange-700 disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          ) : (
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Descripción</h3>
              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                {ticket.description}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="text-orange-600" size={20} />
              <h3 className="font-black text-slate-950">Comentarios</h3>
            </div>

            {loading && (
              <p className="text-sm font-bold text-slate-500">
                Cargando comentarios...
              </p>
            )}
            {!loading && comments.length === 0 && (
              <p className="text-sm font-bold text-slate-500">
                Aún no hay comentarios.
              </p>
            )}
            <div className="grid gap-3">
              {comments.map((comment) => (
                <article className="rounded-2xl bg-slate-50 p-4" key={comment.id}>
                  <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs font-black text-slate-500">
                    <span>
                      {Number(comment.user_id) === Number(user.id)
                        ? "Tú"
                        : `Usuario #${comment.user_id}`}
                    </span>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {comment.comment}
                  </p>
                </article>
              ))}
            </div>

            <form className="mt-4 grid gap-3" onSubmit={sendComment}>
              <textarea
                className={`${inputClass} min-h-24`}
                disabled={saving}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Agregar comentario"
                required
                value={newComment}
              />
              <button
                className="w-fit rounded-xl bg-orange-600 px-5 py-3 font-black text-white transition hover:bg-orange-700 disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Enviando..." : "Comentar"}
              </button>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default TicketDetails;
