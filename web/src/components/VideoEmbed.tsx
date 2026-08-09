interface VideoEmbedProps {
  url: string
  title?: string
}

export default function VideoEmbed({ url, title }: VideoEmbedProps) {
  const embedUrl = url
    .replace('youtube.com/watch?v=', 'youtube.com/embed/')
    .replace('youtu.be/', 'youtube.com/embed/')
    .replace('vimeo.com/', 'player.vimeo.com/video/')

  return (
    <div className="mb-8">
      <div className="relative w-full rounded-xl overflow-hidden border border-stone-200" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={title ?? 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  )
}
