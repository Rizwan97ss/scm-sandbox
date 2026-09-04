import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Modal } from '@/components/ui'
import type { VideoEmbed } from '../utils/videoEmbed'
import '../i18n'

interface VideoPlayerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  embed: VideoEmbed
  fallbackUrl: string | null
}

export function VideoPlayerModal({ open, onOpenChange, title, embed, fallbackUrl }: VideoPlayerModalProps) {
  const { t } = useFeatureTranslation('courseMaterials')

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="xl">
      {embed.kind === 'youtube' || embed.kind === 'vimeo' ? (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={embed.embedUrl}
            title={title}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        </div>
      ) : embed.kind === 'file' ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={embed.url} controls autoPlay className="w-full rounded-md bg-black" />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('list.cannotEmbedVideo')}{' '}
          {fallbackUrl && (
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
              {t('list.openExternally')}
            </a>
          )}
        </p>
      )}
    </Modal>
  )
}
