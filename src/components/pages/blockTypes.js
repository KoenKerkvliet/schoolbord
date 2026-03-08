export const BLOCK_TYPES = [
  {
    id: 'hero',
    label: 'Hero',
    description: 'Grote banner met titel, onderschrift en optionele knop',
    defaultSettings: {
      height: 400,
      backgroundType: 'color',
      backgroundColor: '#1e40af',
      backgroundImage: '',
      title: '',
      subtitle: '',
      buttonText: '',
      buttonLink: '',
      alignment: 'center',
    },
  },
  {
    id: 'mededelingen',
    label: 'Mededelingen',
    description: 'Berichten en mededelingen voor medewerkers',
    defaultSettings: {
      title: 'Mededelingen',
      maxItems: 5,
    },
  },
  {
    id: 'weer',
    label: 'Weer',
    description: 'Weersvoorspelling widget',
    defaultSettings: {
      location: '',
    },
  },
  {
    id: 'nieuws',
    label: 'Nieuws',
    description: 'Nieuwsberichten en updates',
    defaultSettings: {
      title: 'Nieuws',
      maxItems: 5,
    },
  },
  {
    id: 'beschikbaarheid',
    label: 'Beschikbaarheid',
    description: 'Overzicht van beschikbaarheid',
    defaultSettings: {
      title: 'Beschikbaarheid',
    },
  },
  {
    id: 'aanwezigheid',
    label: 'Aanwezigheid',
    description: 'Overzicht van aanwezigheid',
    defaultSettings: {
      title: 'Aanwezigheid',
    },
  },
]

export const getBlockType = (typeId) => {
  return BLOCK_TYPES.find((t) => t.id === typeId) || BLOCK_TYPES[0]
}
