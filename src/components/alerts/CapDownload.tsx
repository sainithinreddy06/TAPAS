'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { api } from '@/lib/api'

export interface CapDownloadProps {
  alertId: string
  wardName?: string
}

/** Validate the document before handing a genuine source export to the browser. */
export function validateCapXml(xml: string, alertId: string): void {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('CAP export contains unsupported XML declarations.')
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const root = document.documentElement
  if (document.querySelector('parsererror') || root.localName !== 'alert' || root.namespaceURI !== 'urn:oasis:names:tc:emergency:cap:1.2') {
    throw new Error('The source did not return a valid CAP 1.2 alert document.')
  }
  const value = (name: string) => Array.from(root.children).find((child) => child.localName === name)?.textContent?.trim()
  if (value('identifier') !== alertId) throw new Error('CAP identifier does not match the requested alert. No file was downloaded.')
  if (!value('sender') || !value('sent') || !Number.isFinite(Date.parse(value('sent') ?? '')) || !['Actual', 'Exercise', 'System', 'Test', 'Draft'].includes(value('status') ?? '')) {
    throw new Error('CAP export is missing required sender, issue time, or status metadata.')
  }
}

export function CapDownload({ alertId, wardName }: CapDownloadProps) {
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      const xml = await api.capXml(alertId)
      validateCapXml(xml, alertId)

      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `${alertId.replace(/[^A-Za-z0-9._-]/g, '_')}.xml`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)

      let copied = false
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(xml)
          copied = true
        }
      } catch {
        // Clipboard access is often blocked outside a secure context; the file
        // download is the primary path, so this is not an error worth showing.
      }

      toast({
        title: 'CAP XML download started',
        description: copied
          ? `${wardName ? `${wardName} alert` : 'Alert'} sent to the browser for download and copied to clipboard.`
          : `${wardName ? `${wardName} alert` : 'Alert'} sent to the browser as ${fileName}.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'CAP export failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not reach the alert service.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={busy}
      data-testid="cap-download"
    >
      <Download className="h-4 w-4" />
      {busy ? 'Preparing…' : 'Download CAP XML'}
    </Button>
  )
}
