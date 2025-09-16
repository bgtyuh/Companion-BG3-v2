import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type {
  AmuletItem,
  ArmourItem,
  CloakItem,
  ClothingItem,
  FootwearItem,
  HandwearItem,
  HeadwearItem,
  RingItem,
  ShieldItem,
  WeaponItem,
} from '../types'
import { AmuletPanel } from './AmuletPanel'
import { ArmouryPanel } from './ArmouryPanel'
import { CloakPanel } from './CloakPanel'
import { ClothingPanel } from './ClothingPanel'
import { FootwearPanel } from './FootwearPanel'
import { HandwearPanel } from './HandwearPanel'
import { HeadwearPanel } from './HeadwearPanel'
import { RingPanel } from './RingPanel'
import { ShieldPanel } from './ShieldPanel'
import { WeaponPanel } from './WeaponPanel'
import './equipment-tabs.css'

type EquipmentTabId =
  | 'armours'
  | 'shields'
  | 'weapons'
  | 'clothing'
  | 'headwears'
  | 'handwears'
  | 'footwears'
  | 'cloaks'
  | 'rings'
  | 'amulets'

interface EquipmentTabsProps {
  armours: ArmourItem[]
  shields: ShieldItem[]
  weapons: WeaponItem[]
  clothing: ClothingItem[]
  headwears: HeadwearItem[]
  handwears: HandwearItem[]
  footwears: FootwearItem[]
  cloaks: CloakItem[]
  rings: RingItem[]
  amulets: AmuletItem[]
}

type TabRefMap = Record<EquipmentTabId, HTMLButtonElement | null>

export function EquipmentTabs({
  armours,
  shields,
  weapons,
  clothing,
  headwears,
  handwears,
  footwears,
  cloaks,
  rings,
  amulets,
}: EquipmentTabsProps) {
  const [activeTab, setActiveTab] = useState<EquipmentTabId>('armours')
  const idPrefix = useId()
  const tabRefs = useRef<TabRefMap>({
    armours: null,
    shields: null,
    weapons: null,
    clothing: null,
    headwears: null,
    handwears: null,
    footwears: null,
    cloaks: null,
    rings: null,
    amulets: null,
  })

  const tabs = [
    {
      id: 'armours' as const,
      label: 'Armurerie',
      content: <ArmouryPanel armours={armours} />,
    },
    {
      id: 'shields' as const,
      label: 'Boucliers',
      content: <ShieldPanel shields={shields} defaultCollapsed={false} />,
    },
    {
      id: 'weapons' as const,
      label: 'Arsenal',
      content: <WeaponPanel weapons={weapons} />,
    },
    {
      id: 'clothing' as const,
      label: 'Tenues',
      content: <ClothingPanel clothing={clothing} defaultCollapsed={false} />,
    },
    {
      id: 'headwears' as const,
      label: 'Coiffes',
      content: <HeadwearPanel headwears={headwears} defaultCollapsed={false} />,
    },
    {
      id: 'handwears' as const,
      label: 'Gants',
      content: <HandwearPanel handwears={handwears} defaultCollapsed={false} />,
    },
    {
      id: 'footwears' as const,
      label: 'Bottes & chaussures',
      content: <FootwearPanel footwears={footwears} defaultCollapsed={false} />,
    },
    {
      id: 'cloaks' as const,
      label: 'Capes',
      content: <CloakPanel cloaks={cloaks} defaultCollapsed={false} />,
    },
    {
      id: 'rings' as const,
      label: 'Anneaux',
      content: <RingPanel rings={rings} defaultCollapsed={false} />,
    },
    {
      id: 'amulets' as const,
      label: 'Amulettes',
      content: <AmuletPanel amulets={amulets} defaultCollapsed={false} />,
    },
  ]

  function focusTab(tabId: EquipmentTabId) {
    const button = tabRefs.current[tabId]
    if (button) {
      button.focus()
    }
  }

  function selectTab(tabId: EquipmentTabId) {
    setActiveTab(tabId)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault()
        const nextIndex = (index + 1) % tabs.length
        const nextTab = tabs[nextIndex]
        selectTab(nextTab.id)
        focusTab(nextTab.id)
        break
      }
      case 'ArrowLeft': {
        event.preventDefault()
        const nextIndex = (index - 1 + tabs.length) % tabs.length
        const nextTab = tabs[nextIndex]
        selectTab(nextTab.id)
        focusTab(nextTab.id)
        break
      }
      case 'Home': {
        event.preventDefault()
        const firstTab = tabs[0]
        selectTab(firstTab.id)
        focusTab(firstTab.id)
        break
      }
      case 'End': {
        event.preventDefault()
        const lastTab = tabs[tabs.length - 1]
        selectTab(lastTab.id)
        focusTab(lastTab.id)
        break
      }
      default:
        break
    }
  }

  return (
    <div className="equipment-tabs">
      <div role="tablist" aria-label="Catégories d'équipement" className="equipment-tabs__list">
        {tabs.map((tab, index) => {
          const buttonClassName = [
            'equipment-tabs__tab',
            activeTab === tab.id ? 'equipment-tabs__tab--active' : undefined,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-${tab.id}-tab`}
              aria-controls={`${idPrefix}-${tab.id}-panel`}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={buttonClassName}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[tab.id] = element
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${idPrefix}-${tab.id}-panel`}
          aria-labelledby={`${idPrefix}-${tab.id}-tab`}
          className="equipment-tabs__panel"
          hidden={activeTab !== tab.id}
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
