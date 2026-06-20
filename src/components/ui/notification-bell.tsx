'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, CheckSquare, Wrench } from 'lucide-react'
import Link from 'next/link'
import { getNotifications, type NotificationItem } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const data = await getNotifications()
      setNotifications(data)
      setUnreadCount(data.length)
    }
    load()
    // Poll every 1 minute
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setUnreadCount(0) // Mark as read when opening
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-800 shadow-xl z-50 overflow-hidden">
          <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-200">Notificações</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Nenhuma notificação no momento.
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className={cn(
                        "mt-0.5 shrink-0 rounded-full p-1.5",
                        item.type === 'OCCURRENCE' && "bg-red-900/50 text-red-400",
                        item.type === 'TASK' && "bg-amber-900/50 text-amber-400",
                        item.type === 'MAINTENANCE' && "bg-sky-900/50 text-sky-400"
                      )}>
                        {item.type === 'OCCURRENCE' && <AlertTriangle className="h-4 w-4" />}
                        {item.type === 'TASK' && <CheckSquare className="h-4 w-4" />}
                        {item.type === 'MAINTENANCE' && <Wrench className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium text-slate-200">
                          {item.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-slate-400">
                          {item.description}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(item.date).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
