import { useState } from 'react';
import Home from './Home';
import InspectionSetup from './InspectionSetup';
import NewBuilding from './NewBuilding';
import FichaEdificio from './FichaEdificio';
import FichaProyecto from './FichaProyecto';
import { registrarAlEditar, registrarAlEliminar, registrarNuevoEdificioEn, registrarNuevoProyecto, registrarVerProyecto } from './navegacion';
import NewProject from './NewProject';
import NewRobot from './NewRobot';
import BuildingEmpty from './BuildingEmpty';
import InspectionLive from './InspectionLive';
import InspectionRecorrido from './InspectionRecorrido';
import Inspecciones from './Inspecciones';
import Mapa from './Mapa';
import type { NavTab } from './ActivityBar';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  // Proyecto recién creado: Nuevo edificio lo muestra ya elegido
  const [proyectoParaEdificio, setProyectoParaEdificio] = useState<string | null>(null);
  const [proyectoEditando, setProyectoEditando] = useState<string | null>(null);
  const [proyectoVista, setProyectoVista] = useState<string | null>(null);
  // Inspección elegida desde el historial de la ficha (null = la última)
  const [relevamientoElegido, setRelevamientoElegido] = useState<number | null>(null);
  // Se fue a crear un proyecto o una edificación desde «Iniciar inspección»: al terminar, se vuelve ahí
  const [volverAInspeccion, setVolverAInspeccion] = useState(false);
  // «+» de un proyecto en la barra lateral: Nuevo edificio con ese proyecto ya elegido
  registrarNuevoEdificioEn(id => { setProyectoParaEdificio(id); setActiveTab('nuevo-edificio'); });
  registrarNuevoProyecto(() => setActiveTab('nuevo-proyecto'));
  registrarVerProyecto(id => { setProyectoVista(id); setActiveTab('ficha-proyecto'); });
  registrarAlEditar((tipo, id) => {
    if (tipo === 'edificio') { setSelectedBuildingId(id); setActiveTab('editar-edificio'); }
    else { setProyectoEditando(id); setActiveTab('editar-proyecto'); }
  });
  registrarAlEliminar((tipo, id) => {
    if (tipo === 'edificio' && id === selectedBuildingId) {
      setSelectedBuildingId(null);
      setActiveTab('dashboard');
    }
    if (tipo === 'proyecto') {
      if (id === proyectoParaEdificio) setProyectoParaEdificio(null);
      if (id === proyectoEditando) { setProyectoEditando(null); setActiveTab('dashboard'); }
      if (id === proyectoVista) { setProyectoVista(null); setActiveTab('dashboard'); }
      // La edificación elegida pudo ser de ese proyecto: se vuelve al inicio
      setSelectedBuildingId(null);
      if (activeTab === 'recorrido' || activeTab === 'ficha-edificio' || activeTab === 'editar-edificio' || activeTab === 'nuevo-edificio') {
        setActiveTab('dashboard');
      }
    }
  });

  // Navegar desde la barra cancela el «volver a Iniciar inspección»
  const handleTabChange = (tab: NavTab) => { setVolverAInspeccion(false); setActiveTab(tab); };

  if (activeTab === 'dashboard' || activeTab === 'edificios' || activeTab === 'equipo') {
    return (
      <Home
        onNavigateToFloorPlan={() => setActiveTab('recorrido')}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
      />
    );
  }

  if (activeTab === 'recorrido') {
    return (
      <InspectionRecorrido
        activeTab={activeTab}
        onTabChange={handleTabChange}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); }}
        onVerFicha={id => { setSelectedBuildingId(id); setActiveTab('ficha-edificio'); }}
        relevamientoId={relevamientoElegido}
        onVerUltima={() => setRelevamientoElegido(null)}
        onElegirInspeccion={setRelevamientoElegido}
        onIniciarInspeccion={() => setActiveTab('inspeccion')}
      />
    );
  }

  if (activeTab === 'ficha-edificio' && selectedBuildingId) {
    return (
      <FichaEdificio
        activeTab={activeTab}
        onTabChange={handleTabChange}
        edificioId={selectedBuildingId}
        onVolver={() => setActiveTab('recorrido')}
        onEditar={() => setActiveTab('editar-edificio')}
        onVerInspeccion={rid => { setRelevamientoElegido(rid); setActiveTab('recorrido'); }}
        onAbrirEdificio={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
        onNuevoEdificio={() => { setProyectoParaEdificio(null); setActiveTab('nuevo-edificio'); }}
      />
    );
  }

  if (activeTab === 'editar-edificio' && selectedBuildingId) {
    return (
      <NewBuilding
        key={`editar-${selectedBuildingId}`}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        edificioId={selectedBuildingId}
        onCancel={() => setActiveTab('ficha-edificio')}
        onCreado={() => setActiveTab('ficha-edificio')}
        onAbrirEdificio={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
        onNuevoEdificio={() => { setProyectoParaEdificio(null); setActiveTab('nuevo-edificio'); }}
      />
    );
  }

  if (activeTab === 'inspecciones') {
    return (
      <Inspecciones
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onVer={(id, rid) => { setSelectedBuildingId(id); setRelevamientoElegido(rid); setActiveTab('recorrido'); }}
      />
    );
  }

  if (activeTab === 'mapa') {
    return (
      <Mapa
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAbrir={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
        onEditar={id => { setSelectedBuildingId(id); setActiveTab('editar-edificio'); }}
      />
    );
  }

  if (activeTab === 'inspeccion') {
    return (
      <InspectionSetup
        key={selectedBuildingId ?? 'ninguna'}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        edificioInicial={selectedBuildingId}
        onNuevoProyecto={() => { setVolverAInspeccion(true); setActiveTab('nuevo-proyecto'); }}
        onNuevaEdificacion={pid => { setVolverAInspeccion(true); setProyectoParaEdificio(pid); setActiveTab('nuevo-edificio'); }}
      />
    );
  }

  if (activeTab === 'nuevo-edificio') {
    return (
      <NewBuilding
        key={`nuevo-${proyectoParaEdificio ?? ''}`}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCancel={() => { const volver = volverAInspeccion; setVolverAInspeccion(false); setActiveTab(volver ? 'inspeccion' : 'dashboard'); }}
        proyectoInicial={proyectoParaEdificio}
        onCreado={id => {
          setProyectoParaEdificio(null); setSelectedBuildingId(id);
          setActiveTab(volverAInspeccion ? 'inspeccion' : 'recorrido');
          setVolverAInspeccion(false);
        }}
        onAbrirEdificio={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
        onNuevoEdificio={() => { setProyectoParaEdificio(null); setActiveTab('nuevo-edificio'); }}
      />
    );
  }

  if (activeTab === 'ficha-proyecto' && proyectoVista) {
    return (
      <FichaProyecto
        key={proyectoVista}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        proyectoId={proyectoVista}
        onEditar={() => { setProyectoEditando(proyectoVista); setActiveTab('editar-proyecto'); }}
        onAbrirEdificio={id => { setSelectedBuildingId(id); setActiveTab('ficha-edificio'); }}
        onSeleccionarEnBarra={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
      />
    );
  }

  if (activeTab === 'editar-proyecto' && proyectoEditando) {
    return (
      <NewProject
        key={`editar-${proyectoEditando}`}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        proyectoId={proyectoEditando}
        onCancel={() => { setProyectoVista(proyectoEditando); setActiveTab('ficha-proyecto'); }}
        onCreado={() => { setProyectoVista(proyectoEditando); setActiveTab('ficha-proyecto'); }}
        onAbrirEdificio={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
      />
    );
  }

  if (activeTab === 'nuevo-proyecto') {
    return (
      <NewProject
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCancel={() => { const volver = volverAInspeccion; setVolverAInspeccion(false); setActiveTab(volver ? 'inspeccion' : 'dashboard'); }}
        onCreado={id => { setProyectoParaEdificio(id); setActiveTab('nuevo-edificio'); }}
        onAbrirEdificio={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); setActiveTab('recorrido'); }}
      />
    );
  }

  if (activeTab === 'nuevo-robot') {
    return <NewRobot activeTab={activeTab} onTabChange={handleTabChange} onCancel={() => setActiveTab('inspeccion')} />;
  }

  if (activeTab === 'building-empty') {
    return <BuildingEmpty activeTab={activeTab} onTabChange={handleTabChange} onStartInspection={() => setActiveTab('inspeccion')} />;
  }

  if (activeTab === 'inspeccion-en-curso') {
    return (
      <InspectionLive
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onStop={id => {
          setRelevamientoElegido(null);
          if (id) { setSelectedBuildingId(id); setActiveTab('recorrido'); } else setActiveTab('dashboard');
        }}
      />
    );
  }

  // Cualquier otra pantalla (ya no existe la de «relevamiento»): el recorrido de la edificación elegida
  return (
    <InspectionRecorrido
      activeTab="recorrido"
      onTabChange={handleTabChange}
      selectedBuildingId={selectedBuildingId}
      onSelectBuilding={id => { setRelevamientoElegido(null); setSelectedBuildingId(id); }}
      onVerFicha={id => { setSelectedBuildingId(id); setActiveTab('ficha-edificio'); }}
      relevamientoId={relevamientoElegido}
      onVerUltima={() => setRelevamientoElegido(null)}
      onElegirInspeccion={setRelevamientoElegido}
      onIniciarInspeccion={() => setActiveTab('inspeccion')}
    />
  );
}
