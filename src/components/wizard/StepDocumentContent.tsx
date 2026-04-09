import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowLeft, ArrowRight, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisRule {
  id: string;
  name: string;
  description: string | null;
  category: string;
  rule_type: string;
  severity: number;
}

interface Props {
  file: File | null;
  text: string;
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
  selectedRuleIds: string[];
  onAnalysisRulesChange: (ids: string[]) => void;
  selectedRiskRuleIds: string[];
  onRiskRulesChange: (ids: string[]) => void;
}

export function StepDocumentContent({ file, text, onFileChange, onTextChange, onNext, onBack, selectedRuleIds, onAnalysisRulesChange, selectedRiskRuleIds, onRiskRulesChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rules, setRules] = useState<AnalysisRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  // Risk rules dialog state
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskRules, setRiskRules] = useState<AnalysisRule[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [tempRiskSelected, setTempRiskSelected] = useState<string[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type === "text/plain")) onFileChange(f);
  };

  const canAdvance = !!file || !!text.trim();

  const openDialog = async () => {
    setTempSelected([...selectedRuleIds]);
    setDialogOpen(true);
    setLoading(true);
    const { data } = await (supabase
      .from("risk_rules")
      .select("id, name, description, category, rule_type, severity") as any)
      .eq("rule_scope", "analysis")
      .eq("is_active", true)
      .order("name");
    setRules(data || []);
    setLoading(false);
  };

  const toggleRule = (id: string) => {
    setTempSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmSelection = () => {
    onAnalysisRulesChange(tempSelected);
    setDialogOpen(false);
  };

  const openRiskDialog = async () => {
    setTempRiskSelected([...selectedRiskRuleIds]);
    setRiskDialogOpen(true);
    setRiskLoading(true);
    const { data } = await (supabase
      .from("risk_rules")
      .select("id, name, description, category, rule_type, severity") as any)
      .eq("rule_scope", "risk")
      .eq("is_active", true)
      .order("name");
    setRiskRules(data || []);
    setRiskLoading(false);
  };

  const toggleRiskRule = (id: string) => {
    setTempRiskSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmRiskSelection = () => {
    onRiskRulesChange(tempRiskSelected);
    setRiskDialogOpen(false);
  };

  return (
    <div className="space-y-5">
      <Tabs defaultValue="file">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload de Arquivo</TabsTrigger>
          <TabsTrigger value="text">Colar Texto</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-3 mt-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
            ) : (
              <>
                <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">PDF ou texto</p>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-3 mt-4">
          <Textarea
            placeholder="Cole o texto do edital aqui..."
            rows={8}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
        </TabsContent>
      </Tabs>

      {/* Risk Rules Selection */}
      <div className="flex items-center gap-3">
        <Button variant="outline" type="button" onClick={openRiskDialog}>
          <ListChecks className="h-4 w-4 mr-2" />
          Selecionar Regras de Risco
          {selectedRiskRuleIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">{selectedRiskRuleIds.length}</Badge>
          )}
        </Button>
        {selectedRiskRuleIds.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedRiskRuleIds.length} regra(s) selecionada(s)
          </span>
        )}
      </div>

      {/* Analysis Rules Selection */}
      <div className="flex items-center gap-3">
        <Button variant="outline" type="button" onClick={openDialog}>
          <ListChecks className="h-4 w-4 mr-2" />
          Selecionar Regras de Análise
          {selectedRuleIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">{selectedRuleIds.length}</Badge>
          )}
        </Button>
        {selectedRuleIds.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedRuleIds.length} regra(s) selecionada(s)
          </span>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Regras de Análise</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma regra de análise ativa encontrada.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {rules.map(rule => (
                <label key={rule.id} className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                  <Checkbox
                    checked={tempSelected.includes(rule.id)}
                    onCheckedChange={() => toggleRule(rule.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{rule.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTempSelected(rules.map(r => r.id))}>
                Selecionar Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTempSelected([])}>
                Limpar
              </Button>
            </div>
            <Button onClick={confirmSelection}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk Rules Dialog */}
      <Dialog open={riskDialogOpen} onOpenChange={setRiskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Regras de Risco</DialogTitle>
          </DialogHeader>
          {riskLoading ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : riskRules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma regra de risco ativa encontrada.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {riskRules.map(rule => (
                <label key={rule.id} className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                  <Checkbox
                    checked={tempRiskSelected.includes(rule.id)}
                    onCheckedChange={() => toggleRiskRule(rule.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{rule.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTempRiskSelected(riskRules.map(r => r.id))}>
                Selecionar Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTempRiskSelected([])}>
                Limpar
              </Button>
            </div>
            <Button onClick={confirmRiskSelection}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={!canAdvance}>
          Próximo <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
