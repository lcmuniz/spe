<template>
  <q-page>
    <q-splitter v-model="splitterModel" :style="{ height: 'calc(100vh - 120px)' }">
      <template #before>
        <DocumentTree
          :processo="processo"
          :setorAtualLabel="setorAtualLabel"
          :documentos="documentos"
          :selected="selectedKey"
          :externosAguardando="externosAguardando"
          @update:selected="onSelect"
          @externo:refresh="onExternoRefresh"
        />
      </template>
      <template #after>
        <q-toolbar dense class="bg-primary text-white" style="min-height: 40px; padding: 0 8px">
          <q-btn
            dense
            flat
            size="sm"
            icon="send"
            label="Tramitar"
            :disable="!podeTramitar"
            @click="openTramitarDialog"
          />
          <q-btn
            dense
            flat
            size="sm"
            icon="person_add"
            label="Atribuir"
            :disable="!podeAtribuir"
            @click="openAtribuirDialog"
          />
          <q-btn
            dense
            flat
            size="sm"
            icon="flag"
            label="Prioridade"
            :disable="!podeMarcarPrioridade"
            @click="openPrioridadeDialog"
          />
          <q-btn
            dense
            flat
            size="sm"
            icon="history"
            label="Histórico"
            :disable="!processo"
            @click="openHistoricoDialog"
          />
          <q-btn
            dense
            flat
            size="sm"
            icon="admin_panel_settings"
            label="Nível de Acesso"
            :disable="!processo"
            @click="openAclDialog"
          />
          <q-btn
            dense
            flat
            size="sm"
            icon="archive"
            label="Arquivar"
            :disable="!podeTramitar"
            @click="arquivarSubmit"
          />
          <q-separator vertical inset class="q-mx-xs" />
          <q-btn
            dense
            flat
            size="sm"
            icon="note_add"
            label="Novo documento"
            :disable="!podeCriarDoc"
            @click="openCriarDocDialog"
          />
          <div class="q-mx-xs">
            <q-btn
              dense
              flat
              size="sm"
              icon="edit"
              label="Editar documento"
              :disable="!canEdit"
              @click="openEditorDialog"
            />
            <q-tooltip v-if="!canEdit && editDisableReason">{{ editDisableReason }}</q-tooltip>
          </div>
          <div class="q-mx-xs">
            <q-btn
              dense
              flat
              size="sm"
              icon="check_circle"
              label="Assinar documento"
              :disable="!canSign"
              @click="assinarDocumento"
            />
            <q-tooltip v-if="!canSign && signDisableReason">{{ signDisableReason }}</q-tooltip>
          </div>
          <div class="q-mx-xs">
            <q-btn
              dense
              flat
              size="sm"
              icon="delete"
              label="Excluir rascunho"
              :disable="!canDeleteDraft"
              @click="excluirRascunho"
            />
            <q-tooltip v-if="!canDeleteDraft && deleteDisableReason">{{
              deleteDisableReason
            }}</q-tooltip>
          </div>
        </q-toolbar>
        <q-card>
          <q-card-section>
            <div class="text-h6" v-if="!selectedDoc">Dados do Processo</div>
            <div class="flex items-center">
              <div class="text-h6" v-if="selectedDoc">
                {{ selectedDoc.titulo }}
              </div>
              <q-space />
              <div v-if="selectedDoc" class="text-caption text-grey-8 q-mt-xs">
                Status: {{ selectedDoc.status }} •
                <span
                  >{{ selectedDoc.modo === 'Editor' ? 'Criado' : 'Enviado' }}:
                  {{ criadoEmStr }}</span
                >
                <span v-if="autorStr"> • por {{ autorStr }}</span>
              </div>
            </div>
          </q-card-section>
          <q-separator />

          <!-- Área principal: dados do processo ou documento selecionado -->
          <q-card-section v-if="selectedKey === 'processo' && processo" class="q-pa-sm">
            <div class="row items-center justify-between">
              <div class="col-auto"><q-space /></div>
              <div class="col-auto q-gutter-sm">
                <q-btn
                  flat
                  label="Cancelar"
                  color="primary"
                  @click="cancelarDados"
                  :disable="!isSameSetor"
                />
                <q-btn
                  unelevated
                  label="Salvar"
                  color="primary"
                  :disable="
                    !isSameSetor || !dadosChanged || isBaseLegalRequiredOnSave
                  "
                  @click="salvarDados"
                />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input v-model="processo.numero" label="Número (NUP)" readonly dense />
              </div>
              <div class="col-12 col-md-8">
                <q-input
                  v-model="dadosForm.assunto"
                  label="Assunto"
                  dense
                  :readonly="!isSameSetor"
                />
              </div>
            </div>
            <div class="row q-col-gutter-md q-mt-sm">
              <div class="col-12 col-md-3">
                <q-select
                  v-model="dadosForm.tipoId"
                  :options="tipoOptions"
                  label="Tipo do Processo"
                  dense
                  emit-value
                  map-options
                  :disable="!isSameSetor"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input v-model="processo.atribuidoA" label="Atribuído a" readonly dense />
              </div>
              <div class="col-12 col-md-3">
                <q-input v-model="processo.prioridade" label="Prioridade" readonly dense />
              </div>
              <div class="col-12 col-md-3">
                <q-select
                  v-model="dadosForm.nivelAcesso"
                  :options="nivelOptions"
                  label="Nível de Acesso"
                  dense
                  :disable="!isSameSetor"
                >
                </q-select>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mt-sm">
              <div class="col-12 col-md-12">
                <q-input
                  v-model="dadosForm.observacoes"
                  label="Observações"
                  type="textarea"
                  dense
                  rows="3"
                  :readonly="!isSameSetor"
                />
              </div>
            </div>
            <div class="row q-col-gutter-md q-mt-sm" v-if="isBaseLegalRequired">
              <div class="col-12">
                <q-input
                  v-model="dadosForm.baseLegal"
                  label="Base legal"
                  dense
                  :readonly="!isSameSetor"
                />
              </div>
            </div>

            <q-separator class="q-my-md" />
            <div class="row">
              <div class="col-12">
                <div class="text-subtitle1 q-mb-sm">Interessados/Partes</div>
                <div class="row q-mb-sm">
                  <div class="col-12">
                    <q-btn
                      dense
                      unelevated
                      color="primary"
                      icon="person_add"
                      label="Adicionar parte"
                      :disable="!podeEditarPartes"
                      @click="abrirParteDialog"
                    />
                  </div>
                </div>
                <q-table
                  flat
                  bordered
                  :rows="partes"
                  :columns="partesColumns"
                  row-key="id"
                  hide-bottom
                  :pagination="{ rowsPerPage: 5 }"
                >
                  <template #body-cell-documento="props">
                    <q-td :props="props">
                      <span v-if="props.value">{{ props.value }}</span>
                      <span v-else class="text-grey">—</span>
                    </q-td>
                  </template>
                  <template #body-cell-actions="props">
                    <q-td :props="props">
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        :disable="!podeEditarPartes"
                        @click="removerParteRow(props.row)"
                      />
                    </q-td>
                  </template>
                </q-table>
              </div>
            </div>
          </q-card-section>

          <q-card-section v-else-if="selectedDoc">
            <div v-if="selectedDoc.modo === 'Editor'">
              <div v-if="selectedDoc.conteudo" v-html="docHtml" class="q-pa-sm"></div>
              <div v-else class="text-caption text-grey">Sem conteúdo</div>
            </div>
            <div v-else>
              <div v-if="isImage">
                <img
                  :src="uploadDataUrl"
                  style="max-width: 100%; border: 1px solid #eee; border-radius: 4px"
                />
              </div>
              <div v-else-if="isPdf" class="q-mt-sm">
                <iframe
                  :src="uploadDataUrl"
                  style="width: 100%; min-height: 70vh; border: none"
                ></iframe>
              </div>
              <div v-else>
                <div>Arquivo: {{ selectedDoc.fileName || 'sem nome' }}</div>
                <div class="q-mt-sm" v-if="selectedDoc.contentBase64">
                  <a :href="uploadDataUrl" :download="selectedDoc.fileName || 'documento.bin'"
                    >Baixar arquivo</a
                  >
                </div>
                <div v-else class="text-caption text-grey">
                  Conteúdo não disponível para visualização.
                </div>
              </div>
            </div>
            <div v-if="selectedDoc.status === 'assinado'" class="q-mt-md q-pa-sm bg-grey-2">
              <div class="flex items-center text-caption text-grey-8">
                <q-icon name="draw" size="24px" class="q-mr-sm" />
                <div>
                  Assinado por
                  <span class="text-red-5 text-italic text-bold"
                    >{{ selectedDoc.assinaturaNome || selectedDoc.assinadoPorLogin }} —
                    {{ selectedDoc.assinaturaCargo || '-' }}</span
                  >
                  <div class="text-caption text-grey-8" v-if="assinaturaEmStr">
                    Em {{ assinaturaEmStr }}
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-section v-else>
            <q-banner dense class="bg-warning"
              >Selecione um item na árvore para visualizar.</q-banner
            >
          </q-card-section>
        </q-card>

        <!-- Diálogo: Editar conteúdo do documento -->
        <q-dialog v-model="editorDialogOpen">
          <q-card
            class="column"
            style="
              width: 90vw;
              max-width: 90vw;
              height: 90vh;
              max-height: 90vh;
              display: flex;
              flex-direction: column;
            "
          >
            <q-card-section>
              <div class="text-h6">Editar conteúdo</div>
              <div class="text-caption">Atualiza o conteúdo quando o modo é Editor</div>
            </q-card-section>
            <q-card-section style="flex: 1; overflow: auto">
              <div class="q-mt-sm">
                <q-editor
                  v-model="editorForm.conteudo"
                  :toolbar="editorToolbar"
                  min-height="60vh"
                />
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Salvar" @click="editorSubmit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Upload de arquivo para o documento -->
        <q-dialog v-model="uploadDialogOpen">
          <q-card style="min-width: 500px">
            <q-card-section>
              <div class="text-h6">Enviar arquivo</div>
              <div class="text-caption">Substitui o conteúdo do documento (modo Upload)</div>
            </q-card-section>
            <q-card-section>
              <q-file v-model="uploadForm.file" label="Selecione um arquivo" filled />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Enviar" @click="uploadSubmit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Tramitar processo -->
        <q-dialog v-model="tramitarDialogOpen">
          <q-card style="min-width: 500px">
            <q-card-section>
              <div class="text-h6">Tramitar processo</div>
              <div class="text-caption">Enviar o processo para outro setor</div>
            </q-card-section>
            <q-card-section class="q-gutter-md">
              <q-select
                v-model="tramitarForm.destinoSetor"
                :options="setorOptions"
                label="Setor destino"
                emit-value
                map-options
              />
              <q-select
                v-model="tramitarForm.prioridade"
                :options="prioridadeOptions"
                label="Prioridade"
              />
              <q-input v-model="tramitarForm.prazo" label="Prazo" type="date" />
              <q-input v-model="tramitarForm.motivo" type="textarea" autogrow label="Motivo" />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Tramitar" @click="tramitarSubmit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Atribuir processo -->
        <q-dialog v-model="atribuirDialogOpen">
          <q-card style="min-width: 500px">
            <q-card-section>
              <div class="text-h6">Atribuir processo</div>
              <div class="text-caption">Defina o responsável dentro do setor atual</div>
            </q-card-section>
            <q-card-section>
              <q-select
                v-model="atribuirForm.usuario"
                :options="usuariosOptions"
                label="Usuário"
                emit-value
                map-options
              />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Atribuir" @click="atribuirSubmit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Marcar prioridade -->
        <q-dialog v-model="prioridadeDialogOpen">
          <q-card style="min-width: 500px">
            <q-card-section>
              <div class="text-h6">Marcar prioridade</div>
              <div class="text-caption">Selecione o nível de prioridade</div>
            </q-card-section>
            <q-card-section>
              <q-option-group
                v-model="prioridadeForm.prioridade"
                :options="prioridadeOptions.map((p) => ({ label: p, value: p }))"
                type="radio"
              />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Salvar" @click="prioridadeSubmit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Histórico -->
        <q-dialog v-model="historicoDialogOpen">
          <q-card style="min-width: 840px">
            <q-card-section>
              <div class="text-h6">Histórico - {{ processo?.numero || '' }}</div>
              <div class="text-caption">Total: {{ historicoItems.length }}</div>
            </q-card-section>
            <q-card-section class="q-pa-none">
              <q-table
                dense
                flat
                :rows="historicoItems"
                :columns="historicoColumns"
                row-key="id"
                :loading="historicoLoading"
                hide-pagination
              >
                <template #body-cell-data="props">
                  <q-td :props="props">{{ formatDateTime(props.row.data) }}</q-td>
                </template>
                <template #body-cell-movimento="props">
                  <q-td :props="props"
                    >{{ props.row.origemSetor }} → {{ props.row.destinoSetor }}</q-td
                  >
                </template>
                <template #body-cell-prioridade="props">
                  <q-td :props="props">{{ props.row.prioridade || '-' }}</q-td>
                </template>
                <template #body-cell-prazo="props">
                  <q-td :props="props">{{
                    props.row.prazo
                      ? new Date(props.row.prazo).toLocaleDateString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                        })
                      : '-'
                  }}</q-td>
                </template>
                <template #body-cell-usuario="props">
                  <q-td :props="props">{{ props.row.usuario || '-' }}</q-td>
                </template>
                <template #body-cell-motivo="props">
                  <q-td :props="props">{{ props.row.motivo || '-' }}</q-td>
                </template>
              </q-table>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Fechar" color="primary" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Criar documento -->
        <q-dialog v-model="criarDocDialogOpen">
          <q-card
            class="column"
            style="
              width: 90vw;
              max-width: 90vw;
              height: 90vh;
              max-height: 90vh;
              display: flex;
              flex-direction: column;
            "
          >
            <q-card-section>
              <div class="text-h6">Criar documento</div>
              <div class="text-caption">Novo documento vinculado ao processo</div>
            </q-card-section>
            <q-card-section style="flex: 1; overflow: auto">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <q-input v-model="docCreateForm.titulo" label="Título" />
                </div>
                <div class="col-12 col-md-4">
                  <q-select v-model="docCreateForm.tipo" :options="tipoDocOptions" label="Tipo" />
                </div>
                <div class="col-12 col-md-4">
                  <q-option-group
                    v-model="docCreateForm.modo"
                    :options="modoDocOptions"
                    type="radio"
                    inline
                  />
                </div>
              </div>
              <div v-if="docCreateForm.modo === 'Upload'">
                <q-file v-model="docCreateForm.arquivo" label="Selecione o arquivo" filled />
              </div>
              <div v-else>
                <div class="q-mt-sm">
                  <q-editor
                    v-model="docCreateForm.conteudo"
                    :toolbar="editorToolbar"
                    min-height="60vh"
                  />
                </div>
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Salvar" @click="criarDocSubmit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Vincular parte do cadastro -->
        <q-dialog v-model="parteDialogOpen">
          <q-card style="min-width: 700px">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">Vincular parte do cadastro</div>
              <q-space />
              <q-btn
                dense
                unelevated
                icon="person_add"
                label="Cadastrar Parte"
                @click="abrirCadastroCreateDialog"
              />
            </q-card-section>
            <q-card-section>
              <div class="text-caption">Selecione uma parte já cadastrada</div>
            </q-card-section>
            <q-card-section class="q-gutter-md">
              <q-input
                v-model="cadastroSearch"
                label="Buscar parte (nome, documento)"
                dense
                @update:model-value="(val) => loadCadastroPartes(val)"
              />
              <q-table
                flat
                bordered
                :rows="cadastroPartes"
                :columns="cadastroColumns"
                row-key="id"
                hide-bottom
                selection="single"
                v-model:selected="cadastroSelecionada"
                :pagination="{ rowsPerPage: 5 }"
              >
                <template #body-cell-documento="props">
                  <q-td :props="props">
                    <span v-if="props.value">{{ props.value }}</span>
                    <span v-else class="text-grey">—</span>
                  </q-td>
                </template>
              </q-table>
              <q-select v-model="parteForm.papel" :options="papelOptions" label="Papel" />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn color="primary" label="Vincular" @click="confirmarParte" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Diálogo: Cadastro rápido de parte -->
        <q-dialog v-model="cadastroCreateDialogOpen">
          <q-card style="min-width: 600px">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">Cadastrar Parte</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <q-card-section>
              <ParteCadastroForm
                v-model="cadastroCreateForm"
                @submit="confirmarCadastroCreate"
                @reset="onCadastroCreateReset"
              />
            </q-card-section>
          </q-card>
        </q-dialog>

        <!-- ACL Dialog -->
        <q-dialog v-model="aclDialogOpen">
          <q-card style="min-width: 700px">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">Gerenciar Acesso</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <div class="q-mt-md">
                    <div class="text-subtitle2 q-mb-sm">Adicionar acesso</div>
                    <div class="row q-col-gutter-sm">
                      <div class="col-12 col-md-4">
                        <q-select
                          v-model="aclForm.tipo"
                          :options="[
                            { label: 'Setor', value: 'SETOR' },
                            { label: 'Usuário', value: 'USUARIO' },
                            { label: 'Parte', value: 'PARTE' },
                          ]"
                          label="Tipo"
                          dense
                          emit-value
                          map-options
                        />
                      </div>
                      <div class="col-12 col-md-8">
                        <q-select
                          v-if="aclForm.tipo === 'SETOR'"
                          v-model="aclForm.valor"
                          :options="setorOptions"
                          label="Setor"
                          dense
                          emit-value
                          map-options
                        />
                        <q-select
                          v-else-if="aclForm.tipo === 'USUARIO'"
                          v-model="aclForm.valor"
                          :options="usuariosAcessoOptions"
                          label="Usuário"
                          dense
                          emit-value
                          map-options
                        />
                        <q-select
                          v-else
                          v-model="aclForm.parteId"
                          :options="
                            (partes || []).map((p) => ({
                              label: `${p.nome} (${p.documento || '—'})`,
                              value: p.id,
                            }))
                          "
                          label="Parte"
                          dense
                          emit-value
                          map-options
                        />
                      </div>
                    </div>
                    <div class="row justify-end q-mt-sm">
                      <q-btn
                        label="Adicionar"
                        color="primary"
                        @click="addAcessoSubmit"
                        :disable="aclForm.tipo === 'PARTE' ? !aclForm.parteId : !aclForm.valor"
                      />
                    </div>
                  </div>
                  <div class="text-subtitle2 q-mb-sm">Acessos concedidos</div>
                  <q-list bordered dense>
                    <q-item v-for="a in acessos" :key="a.id">
                      <q-item-section>
                        <q-item-label>{{ a.tipo }}</q-item-label>
                        <q-item-label caption v-if="a.tipo !== 'PARTE'">{{ a.valor }}</q-item-label>
                        <q-item-label caption v-else
                          >{{ a.parteNome }} ({{ a.parteDocumento || '—' }})</q-item-label
                        >
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="negative"
                          @click="removerAcessoRow(a)"
                        />
                      </q-item-section>
                    </q-item>
                    <div v-if="!acessos.length" class="text-grey q-pa-sm">Nenhum acesso</div>
                  </q-list>
                </div>
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Fechar" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </template>
    </q-splitter>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { marked } from 'marked'
import {
  listByProcessoId,
  seedByProcessoId,
  getDocumento as getDocumentoService,
  updateEditorConteudo,
  uploadConteudo,
  createDocumento,
  linkDocumentoToProcesso,
  assinarDocumento as assinarDocumentoService,
  deletarDocumento,
} from 'src/services/documentosService'
import {
  getProcesso,
  atualizarDados,
  tramitarProcesso,
  atribuirProcesso,
  atualizarPrioridade,
  listarTramites,
  removerParte,
  adicionarParte,
  listarAcessos,
  adicionarAcesso,
  removerAcesso,
  arquivarProcesso,
} from 'src/services/processosService'
import { listarSetores, listarTiposProcesso } from 'src/services/catalogService'
import { listarUsuarios } from 'src/services/usuariosService'
import { listarPartesCadastro, criarParteCadastro } from 'src/services/partesCadastroService'
import ParteCadastroForm from 'src/components/ParteCadastroForm.vue'
import { fileToBase64 } from 'src/utils/file'
import DocumentTree from 'src/components/DocumentTree.vue'
import { listarDocumentosExternosPorProcesso } from 'src/services/externoDocsService'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const processo = ref(null)
const documentos = ref([])
const splitterModel = ref(25)
const selectedKey = ref('processo')
const selectedDoc = ref(null)
const externosAguardando = ref([])

// Partes do processo
const partes = ref([])
const partesColumns = [
  { name: 'tipo', label: 'Tipo', field: 'tipo' },
  { name: 'nome', label: 'Nome', field: 'nome' },
  { name: 'documento', label: 'Documento', field: 'documento' },
  { name: 'papel', label: 'Papel', field: 'papel' },
  { name: 'actions', label: 'Ações', field: 'id', align: 'right' },
]
// Seleção de partes do cadastro
const cadastroSearch = ref('')
const cadastroPartes = ref([])
const cadastroSelecionada = ref([])
const cadastroColumns = [
  { name: 'tipo', label: 'Tipo', field: 'tipo' },
  { name: 'nome', label: 'Nome', field: 'nome' },
  { name: 'documento', label: 'Documento', field: 'documento' },
]
const cadastroCreateDialogOpen = ref(false)
const cadastroCreateForm = ref({
  tipo: 'FISICA',
  nome: '',
  documento: '',
  email: '',
  telefone: '',
  endereco_logradouro: '',
  endereco_numero: '',
  endereco_complemento: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_cep: '',
})
const parteDialogOpen = ref(false)
const parteForm = ref({ papel: 'Requerente' })
const keycloak = inject('keycloak', null)
function getUsuarioLogin() {
  return keycloak?.tokenParsed?.preferred_username || null
}

const viewerSetor = ref(null)
async function loadViewerSetor() {
  try {
    const login = getUsuarioLogin()
    if (!login) return
    const users = await listarUsuarios({ login })
    const setor = Array.isArray(users) ? users[0]?.setor : users?.setor
    viewerSetor.value = String(setor || '').toUpperCase()
  } catch (e) {
    console.error('Falha ao obter setor do usuário', e)
    viewerSetor.value = null
  }
}
const isSameSetor = computed(() => {
  const viewer = String(viewerSetor.value || '').toUpperCase()
  const atual = String(processo.value?.setor || '').toUpperCase()
  return !!viewer && !!atual && viewer === atual
})
const editorDialogOpen = ref(false)
const editorForm = ref({ conteudo: '' })

const editorToolbar = [
  ['bold', 'italic', 'strike', 'underline', 'removeFormat'],
  ['left', 'center', 'right', 'justify'],
  ['unordered', 'ordered', 'outdent', 'indent'],
  ['blockquote', 'hr'],
  ['link', 'unlink'],
  ['undo', 'redo'],
  ['view-source', 'fullscreen'],
]
function openEditorDialog() {
  const doc = selectedDoc.value
  if (!doc || doc.modo !== 'Editor') return
  if (doc.status === 'assinado') {
    const me = getUsuarioLogin()
    if (!doc.assinadoPorLogin || doc.assinadoPorLogin !== me) {
      $q.notify({
        type: 'warning',
        message: 'Documento assinado por outro usuário. Edição bloqueada.',
      })
      return
    }
    $q.dialog({
      title: 'Confirmar edição',
      message: 'Ao editar, o documento perderá a assinatura. Deseja prosseguir?',
      cancel: true,
      ok: { label: 'Prosseguir', color: 'primary' },
    }).onOk(async () => {
      try {
        $q.loading?.show()
        await updateEditorConteudo(doc.id, String(doc.conteudo || ''), me || undefined)
        await loadDocumento(doc.id)
        await loadDocumentos()
        selectedKey.value = doc.id
      } catch (e) {
        console.error(e)
        const msg = e?.response?.data?.error || 'Falha ao iniciar edição'
        $q.notify({ type: 'negative', message: msg })
        return
      } finally {
        $q.loading?.hide()
      }
      editorForm.value.conteudo = String(selectedDoc.value?.conteudo || '')
      editorDialogOpen.value = true
    })
    return
  }
  editorForm.value.conteudo = String(doc.conteudo || '')
  editorDialogOpen.value = true
}
async function editorSubmit() {
  const id = selectedDoc.value?.id
  if (!id) return
  try {
    await updateEditorConteudo(id, editorForm.value.conteudo, getUsuarioLogin() || undefined)
    $q.notify({ type: 'positive', message: 'Conteúdo atualizado' })
    editorDialogOpen.value = false
    await loadDocumento(id)
  } catch (e) {
    console.error(e)
    const msg = e?.response?.data?.error || 'Falha ao salvar conteúdo'
    $q.notify({ type: 'negative', message: msg })
  }
}

const uploadDialogOpen = ref(false)
const uploadForm = ref({ file: null })

async function uploadSubmit() {
  const id = selectedDoc.value?.id
  const file = uploadForm.value.file
  if (!id || !file) {
    $q.notify({ type: 'warning', message: 'Selecione um documento e um arquivo' })
    return
  }
  const doc = selectedDoc.value
  if (doc?.status === 'assinado') {
    const me = getUsuarioLogin()
    if (!doc.assinadoPorLogin || doc.assinadoPorLogin !== me) {
      $q.notify({
        type: 'warning',
        message: 'Documento assinado por outro usuário. Upload bloqueado.',
      })
      return
    }
    let proceed = false
    await new Promise((resolve) => {
      $q.dialog({
        title: 'Confirmar substituição',
        message: 'Ao enviar, o documento perderá a assinatura. Deseja prosseguir?',
        cancel: true,
        ok: { label: 'Prosseguir', color: 'primary' },
      })
        .onOk(() => {
          proceed = true
          resolve()
        })
        .onCancel(() => resolve())
    })
    if (!proceed) return
  }
  try {
    const base64 = await fileToBase64(file)
    await uploadConteudo(id, file.name || 'arquivo.bin', base64, getUsuarioLogin() || undefined)
    $q.notify({ type: 'positive', message: 'Upload atualizado' })
    uploadDialogOpen.value = false
    await loadDocumento(id)
  } catch (e) {
    console.error(e)
    const msg = e?.response?.data?.error || 'Falha no upload'
    $q.notify({ type: 'negative', message: msg })
  }
}

const canEdit = computed(() => {
  const d = selectedDoc.value
  const p = processo.value
  const me = getUsuarioLogin()
  if (!d || d.modo !== 'Editor') return false
  if (!isAtEndOfTree(d.id)) return false
  if (String(d.status || '').toLowerCase() === 'assinado') {
    return d.assinadoPorLogin === me && !!p && p.atribuidoA === me
  }
  return true
})

function isAllowedUploadToSign(d) {
  if (!d || d.modo !== 'Upload') return false
  const name = String(d.fileName || '')
  const ext = (name.split('.').pop() || '').toLowerCase()
  const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'gif']
  return !!d.contentBase64 && !!name && !!ext && allowed.includes(ext)
}

const isAtEndOfTree = (docId) => {
  const docs = documentos.value || []
  const viewer = String(viewerSetor.value || '').toUpperCase()
  if (!viewer) return false
  const index = docs.findIndex((r) => String(r.id) === String(docId))
  if (index < 0) return false
  let lastCrossIndex = -1
  for (let i = 0; i < docs.length; i++) {
    const r = docs[i]
    const signed = String(r.status || '').toLowerCase() === 'assinado'
    const signerSetor = String(r.assinanteSetor || '').toUpperCase()
    if (signed && signerSetor && signerSetor !== viewer) {
      lastCrossIndex = i
    }
  }
  const endStart = lastCrossIndex + 1
  return index >= endStart
}

const canSign = computed(() => {
  const d = selectedDoc.value
  const p = processo.value
  const me = getUsuarioLogin()
  const allowedDoc =
    !!d &&
    String(d.status || '').toLowerCase() === 'rascunho' &&
    !!d.id &&
    (d.modo === 'Editor' || isAllowedUploadToSign(d))
  return isSameSetor.value && allowedDoc && !!p && p.atribuidoA === me && isAtEndOfTree(d.id)
})

const canDeleteDraft = computed(() => {
  const d = selectedDoc.value
  const me = getUsuarioLogin()
  return (
    isSameSetor.value &&
    !!d &&
    String(d.status || '').toLowerCase() === 'rascunho' &&
    d.autorLogin === me
  )
})

const editDisableReason = computed(() => {
  const d = selectedDoc.value
  const p = processo.value
  const me = getUsuarioLogin()
  if (!isSameSetor.value) return 'Ação não permitida fora do setor atual'
  if (!d) return 'Selecione um documento'
  if (d.modo !== 'Editor') return 'Ação disponível apenas para modo Editor'
  if (!isAtEndOfTree(d.id)) return 'Documento não está no fim da árvore'
  if (String(d.status || '').toLowerCase() === 'assinado') {
    if (d.assinadoPorLogin !== me) return 'Documento assinado por outro usuário'
    if (!p || p.atribuidoA !== me) return 'Processo não está atribuído a você'
  }
  return ''
})

const signDisableReason = computed(() => {
  const d = selectedDoc.value
  const p = processo.value
  const me = getUsuarioLogin()
  if (!isSameSetor.value) return 'Ação não permitida fora do setor atual'
  if (!d) return 'Selecione um documento'
  if (String(d.status || '').toLowerCase() !== 'rascunho')
    return 'Apenas rascunhos podem ser assinados'
  if (!d.id) return 'Documento inválido'
  if (!(d.modo === 'Editor' || isAllowedUploadToSign(d))) {
    if (d.modo === 'Upload') return 'Arquivo inválido para assinatura (pdf/png/jpg/jpeg/gif)'
    return 'Documento não está pronto para assinatura'
  }
  if (!p || p.atribuidoA !== me) return 'Processo não está atribuído a você'
  if (!isAtEndOfTree(d.id)) return 'Documento não está no fim da árvore'
  return ''
})

const deleteDisableReason = computed(() => {
  const d = selectedDoc.value
  const me = getUsuarioLogin()
  if (!isSameSetor.value) return 'Ação não permitida fora do setor atual'
  if (!d) return 'Selecione um documento'
  if (String(d.status || '').toLowerCase() !== 'rascunho')
    return 'Apenas rascunhos podem ser excluídos'
  if (d.autorLogin !== me) return 'Somente rascunhos criados por você podem ser excluídos'
  return ''
})

async function excluirRascunho() {
  const id = selectedDoc.value?.id
  if (!id) {
    $q.notify({ type: 'warning', message: 'Selecione um documento' })
    return
  }
  const d = selectedDoc.value
  const me = getUsuarioLogin()
  if (!d || d.status !== 'rascunho' || d.autorLogin !== me) {
    $q.notify({ type: 'warning', message: 'Apenas rascunhos criados por você podem ser excluídos' })
    return
  }
  $q.dialog({
    title: 'Confirmar exclusão',
    message: 'Esta ação não pode ser desfeita. Deseja excluir o rascunho?',
    cancel: true,
    ok: { label: 'Excluir', color: 'negative' },
  }).onOk(async () => {
    $q.loading?.show()
    try {
      await deletarDocumento(id, me || undefined)
      $q.notify({ type: 'positive', message: 'Rascunho excluído' })
      await loadDocumentos()
      selectedKey.value = 'processo'
      selectedDoc.value = null
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.error || 'Falha ao excluir rascunho'
      $q.notify({ type: 'negative', message: msg })
    } finally {
      $q.loading?.hide()
    }
  })
}

async function assinarDocumento() {
  const id = selectedDoc.value?.id
  if (!id) {
    $q.notify({ type: 'warning', message: 'Selecione um documento' })
    return
  }
  const d = selectedDoc.value
  const allowedUpload = isAllowedUploadToSign(d)
  if (!d || (d.modo !== 'Editor' && !allowedUpload)) {
    $q.notify({
      type: 'warning',
      message: 'Apenas documentos do Editor ou uploads (PDF/imagem) podem ser assinados',
    })
    return
  }
  const p = processo.value
  const me = getUsuarioLogin()
  if (!p || p.atribuidoA !== me) {
    $q.notify({ type: 'warning', message: 'Somente o responsável atual do processo pode assinar' })
    return
  }
  $q.dialog({
    title: 'Confirmar assinatura',
    message: 'Digite sua senha para confirmar a assinatura do documento.',
    cancel: true,
    persistent: true,
    prompt: {
      model: '',
      type: 'password',
      label: 'Senha',
      isValid: (val) => !!String(val || '').trim(),
    },
  }).onOk(async (senha) => {
    $q.loading?.show()
    try {
      const ok = await validatePasswordWithKeycloak(String(senha || ''))
      if (!ok) {
        $q.notify({ type: 'negative', message: 'Senha inválida' })
        return
      }
      await assinarDocumentoService(id, getUsuarioLogin() || undefined)
      $q.notify({ type: 'positive', message: 'Documento assinado' })
      await loadDocumento(id)
      await loadDocumentos()
      selectedKey.value = id
    } catch (e) {
      console.error(e)
      const msg = e?.response?.data?.error || 'Falha ao assinar documento'
      $q.notify({ type: 'negative', message: msg })
    } finally {
      $q.loading?.hide()
    }
  })
}

async function validatePasswordWithKeycloak(senha) {
  try {
    const login = getUsuarioLogin()
    if (!login || !senha) return false
    const base = keycloak?.authServerUrl || 'https://keycloak.tcema.tc.br'
    const realm = keycloak?.realm || 'TCE'
    const clientId = keycloak?.clientId || 'spe'
    const url = `${base}/realms/${realm}/protocol/openid-connect/token`
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username: login,
      password: senha,
    })
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!resp.ok) return false
    const json = await resp.json().catch(() => null)
    return !!json?.access_token
  } catch (e) {
    console.error('Falha na validação de senha:', e)
    return false
  }
}

const assinaturaEmStr = computed(() => {
  const raw = selectedDoc.value?.assinadoEm
  if (!raw) return ''
  const dt = new Date(raw)
  if (isNaN(dt.getTime())) return String(raw)
  try {
    return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch (_e) {
    return dt.toISOString()
  }
})

async function loadDocumentos() {
  try {
    const { id } = route.params
    const data = await listByProcessoId(id, { viewerSetor: viewerSetor.value })
    const sameSetor =
      !!viewerSetor.value &&
      !!processo.value &&
      viewerSetor.value === String(processo.value.setor || '').toUpperCase()
    if (Array.isArray(data) && data.length === 0) {
      if (sameSetor) {
        documentos.value = await seedByProcessoId(id, { viewerSetor: viewerSetor.value })
      } else {
        documentos.value = []
      }
    } else {
      documentos.value = data || []
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao carregar documentos do processo' })
  }
}

async function loadExternosAguardando() {
  try {
    const { id } = route.params
    const data = await listarDocumentosExternosPorProcesso({
      processoId: id,
      status: 'aguardando_analise',
    })
    externosAguardando.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error(e)
    externosAguardando.value = []
    $q.notify({ type: 'negative', message: 'Falha ao carregar anexos externos aguardando análise' })
  }
}

async function onExternoRefresh() {
  await loadDocumentos()
  await loadExternosAguardando()
}

async function loadDocumento(docId) {
  try {
    selectedDoc.value = await getDocumentoService(docId)
  } catch (e) {
    console.error(e)
    selectedDoc.value = null
    $q.notify({ type: 'negative', message: 'Falha ao carregar documento' })
  }
}

const docHtml = computed(() => {
  if (!selectedDoc.value || selectedDoc.value.modo !== 'Editor') return ''
  const raw = String(selectedDoc.value.conteudo || '').trim()
  if (!raw) return ''
  const looksHtml = raw.startsWith('<') && raw.includes('>')
  return looksHtml ? raw : marked.parse(raw)
})

const criadoEmStr = computed(() => {
  const d = selectedDoc.value
  if (!d) return ''
  const raw = d.criadoEm || d.createdAt || d.uploadedAt || null
  if (!raw) return ''
  const dt = new Date(raw)
  if (isNaN(dt.getTime())) return String(raw)
  try {
    return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch (_e) {
    return dt.toISOString()
  }
})
const autorStr = computed(() => {
  const nome = selectedDoc.value?.autorNome
  const login = selectedDoc.value?.autorLogin
  if (nome && login) return `${nome} (${login})`
  return nome || login || ''
})

const uploadMime = computed(() => {
  const name = selectedDoc.value?.fileName?.toLowerCase() || ''
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.bmp')) return 'image/bmp'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.svg')) return 'image/svg+xml'
  if (name.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
})

const uploadDataUrl = computed(() => {
  const base64 = selectedDoc.value?.contentBase64 || ''
  return base64 ? `data:${uploadMime.value};base64,${base64}` : ''
})

const isImage = computed(() => uploadMime.value.startsWith('image/'))
const isPdf = computed(() => uploadMime.value === 'application/pdf')

function onSelect(key) {
  if (!key || key === selectedKey.value) {
    return
  }
  selectedKey.value = key
  if (key === 'processo') {
    selectedDoc.value = null
  } else {
    loadDocumento(key)
  }
}

onMounted(async () => {
  try {
    await loadViewerSetor()
    const { id } = route.params
    const data = await getProcesso(id)
    processo.value = data
    partes.value = Array.isArray(data.partes) ? data.partes : []
    // Inicializa formulário de edição dos dados do processo
    dadosForm.value = {
      assunto: String(data.assunto || ''),
      tipoId: data.tipoId || null,
      nivelAcesso: String(data.nivelAcesso || 'Público'),
      observacoes: String(data.observacoes || ''),
      baseLegal: String(data.baseLegal || ''),
    }
    await loadTipoOptions()
    await loadSetoresOptions()
    await loadDocumentos()
    await loadExternosAguardando()
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao carregar processo' })
  }
})

// Formulário de dados do processo (edição)
const dadosForm = ref({ assunto: '', tipoId: null, nivelAcesso: 'Público', observacoes: '', baseLegal: '' })
const nivelOptions = ['Público', 'Restrito', 'Sigiloso']
const tipoOptions = ref([])
async function loadTipoOptions() {
  try {
    const data = await listarTiposProcesso()
    const arr = Array.isArray(data) ? data : []
    tipoOptions.value = arr.map((t) => ({ label: t.nome, value: t.id }))
    if (!dadosForm.value.tipoId) {
      dadosForm.value.tipoId = tipoOptions.value[0]?.value || null
    }
  } catch (e) {
    console.error('Falha ao carregar tipos de processo', e)
    tipoOptions.value = []
  }
}
const isBaseLegalRequiredOnSave = computed(() => {
  const p = processo.value || {}
  const nivelChanged =
    String(dadosForm.value.nivelAcesso || 'Público') !== String(p.nivelAcesso || 'Público')
  const novoNivel = String(dadosForm.value.nivelAcesso || 'Público')
  return nivelChanged && novoNivel !== 'Público' && !String(dadosForm.value.baseLegal || '').trim()
})
const dadosChanged = computed(() => {
  const p = processo.value || {}
  return (
    String(dadosForm.value.assunto || '') !== String(p.assunto || '') ||
    String(dadosForm.value.nivelAcesso || 'Público') !== String(p.nivelAcesso || 'Público') ||
    String(dadosForm.value.observacoes || '') !== String(p.observacoes || '') ||
    String(dadosForm.value.baseLegal || '') !== String(p.baseLegal || '') ||
    String(dadosForm.value.tipoId || '') !== String(p.tipoId || '')
  )
})

async function salvarDados() {
  try {
    const { id } = route.params
    const p = processo.value || {}
    const payload = {}

    if (String(dadosForm.value.assunto || '') !== String(p.assunto || '')) {
      payload.assunto = dadosForm.value.assunto || ''
    }
    if (String(dadosForm.value.tipoId || '') !== String(p.tipoId || '')) {
      payload.tipoId = dadosForm.value.tipoId || undefined
    }
    if (
      String(dadosForm.value.nivelAcesso || 'Público') !== String(p.nivelAcesso || 'Público')
    ) {
      payload.nivelAcesso = dadosForm.value.nivelAcesso || 'Público'
    }
    if (String(dadosForm.value.observacoes || '') !== String(p.observacoes || '')) {
      payload.observacoes = dadosForm.value.observacoes || ''
    }
    if (String(dadosForm.value.baseLegal || '') !== String(p.baseLegal || '')) {
      payload.baseLegal = dadosForm.value.baseLegal || ''
    }

    if (isBaseLegalRequiredOnSave.value) {
      $q.notify({ type: 'warning', message: 'Base legal é obrigatória para nível de acesso não público' })
      return
    }

    const updated = await atualizarDados(id, payload)
    const nivel = String((updated?.nivelAcesso ?? payload.nivelAcesso) || 'Público')
    if (updated) {
      processo.value = updated
      dadosForm.value = {
        assunto: String(updated.assunto || ''),
        tipoId: updated.tipoId || null,
        nivelAcesso: String(updated.nivelAcesso || 'Público'),
        observacoes: String(updated.observacoes || ''),
        baseLegal: String(updated.baseLegal || ''),
      }
    }
    // Regras de ACL conforme nível de acesso
    try {
      if (nivel === 'Público') {
        // Remover acessos de USUÁRIO/SETOR (manter chaves)
        const lista = await listarAcessos(id)
        for (const a of lista) {
          if (a.tipo === 'USUARIO' || a.tipo === 'SETOR') {
            await removerAcesso(id, a.id, { executadoPor: getUsuarioLogin() })
          }
        }
      } else {
        // Garantir acesso ao usuário atual e pelo menos um acesso
        const lista = await listarAcessos(id)
        const me = getUsuarioLogin()
        const temAlgum = lista.some((a) => a.tipo === 'USUARIO' || a.tipo === 'SETOR')
        const jaTemUsuario =
          !!me &&
          lista.some(
            (a) =>
              a.tipo === 'USUARIO' &&
              String(a.valor || '').toLowerCase() === String(me || '').toLowerCase(),
          )
        if (!!me && !jaTemUsuario) {
          await adicionarAcesso(id, { tipo: 'USUARIO', valor: me, executadoPor: me })
        } else if (!temAlgum && !!me) {
          await adicionarAcesso(id, { tipo: 'USUARIO', valor: me, executadoPor: me })
        }
      }
      await loadAcl()
      const proc = await getProcesso(id)
      processo.value = proc
    } catch (e2) {
      console.error('Falha ao aplicar regras de ACL após salvar', e2)
    }

    $q.notify({ type: 'positive', message: 'Dados do processo atualizados' })
  } catch (e) {
    console.error(e)
    const msg = e?.response?.data?.error || 'Falha ao salvar dados do processo'
    $q.notify({ type: 'negative', message: msg })
  }
}

function cancelarDados() {
  const p = processo.value || {}
  dadosForm.value = {
    assunto: String(p.assunto || ''),
    tipoId: p.tipoId || null,
    nivelAcesso: String(p.nivelAcesso || 'Público'),
    observacoes: String(p.observacoes || ''),
    baseLegal: String(p.baseLegal || ''),
  }
}

// Novas regras de habilitação
const podeTramitar = computed(
  () => !!processo.value && processo.value.atribuidoA === getUsuarioLogin(),
)
const podeMarcarPrioridade = computed(() => {
  const p = processo.value
  const me = getUsuarioLogin()
  return isSameSetor.value && !!p && (!p.atribuidoA || p.atribuidoA === me)
})
const podeEditarPartes = computed(
  () => isSameSetor.value && !!processo.value && processo.value.atribuidoA === getUsuarioLogin(),
)
const podeAtribuir = computed(() => !!processo.value && isSameSetor.value)
const podeCriarDoc = computed(() => !!processo.value && isSameSetor.value)
function abrirParteDialog() {
  cadastroSearch.value = ''
  cadastroSelecionada.value = []
  parteForm.value = { papel: 'Requerente' }
  loadCadastroPartes()
  parteDialogOpen.value = true
}

function abrirCadastroCreateDialog() {
  cadastroCreateForm.value = {
    tipo: 'FISICA',
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_cep: '',
  }
  cadastroCreateDialogOpen.value = true
}

async function loadCadastroPartes(q) {
  try {
    const rows = await listarPartesCadastro({ q: (q || '').trim() || undefined, limit: 50 })
    cadastroPartes.value = rows || []
  } catch (e) {
    console.error('Falha ao carregar cadastro de partes', e)
    cadastroPartes.value = []
  }
}

function onCadastroCreateReset() {
  cadastroCreateForm.value = {
    tipo: 'FISICA',
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_cep: '',
  }
}

async function confirmarCadastroCreate() {
  try {
    if (!cadastroCreateForm.value.nome) {
      $q.notify({ type: 'warning', message: 'Informe o nome da parte' })
      return
    }
    const created = await criarParteCadastro({
      ...cadastroCreateForm.value,
      executadoPor: getUsuarioLogin(),
    })
    // Inclui na lista e seleciona
    cadastroPartes.value = [created, ...(cadastroPartes.value || [])]
    cadastroSelecionada.value = [created]
    $q.notify({ type: 'positive', message: 'Parte cadastrada' })
    cadastroCreateDialogOpen.value = false
  } catch (e) {
    console.error(e)
    const msg = e?.response?.data?.error || e?.message || 'Falha ao cadastrar parte'
    $q.notify({ type: 'negative', message: msg })
  }
}

async function confirmarParte() {
  try {
    const selected = Array.isArray(cadastroSelecionada.value) ? cadastroSelecionada.value[0] : null
    if (!selected) {
      $q.notify({ type: 'warning', message: 'Selecione uma parte do cadastro' })
      return
    }
    const { id } = route.params
    const resp = await adicionarParte(id, {
      parteId: selected.id,
      papel: parteForm.value.papel || null,
      executadoPor: getUsuarioLogin(),
    })
    const novaParte = resp?.parte || resp
    partes.value = [...(partes.value || []), novaParte]
    $q.notify({ type: 'positive', message: 'Parte vinculada ao processo' })
    parteDialogOpen.value = false
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Falha ao vincular parte' })
  }
}

function removerParteRow(row) {
  $q.dialog({
    title: 'Remover parte',
    message: `Confirma remover "${row?.nome || 'parte'}"?`,
    cancel: true,
    ok: { label: 'Remover', color: 'negative' },
  }).onOk(async () => {
    try {
      const { id } = route.params
      await removerParte(id, row.id, { executadoPor: getUsuarioLogin() })
      partes.value = partes.value.filter((p) => String(p.id) !== String(row.id))
      $q.notify({ type: 'positive', message: 'Parte removida' })
    } catch (e) {
      console.error(e)
      $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Falha ao remover parte' })
    }
  })
}

// Tramitar
const tramitarDialogOpen = ref(false)
const tramitarForm = ref({ destinoSetor: null, motivo: '', prioridade: null, prazo: '' })
const setorOptions = ref([])
const setorAtualLabel = computed(() => {
  const s = String(processo.value?.setor || '').toUpperCase()
  if (!s) return ''
  const opt = (setorOptions.value || []).find((o) => String(o.value || '').toUpperCase() === s)
  return opt?.label || s
})
const prioridadeOptions = ['Baixa', 'Normal', 'Alta', 'Urgente']
async function loadSetoresOptions() {
  try {
    const data = await listarSetores()
    setorOptions.value = (data || []).map((s) => ({
      label: `${s.nome} (${String(s.sigla).toUpperCase()})`,
      value: String(s.sigla).toUpperCase(),
    }))
  } catch (e) {
    console.error(e)
    setorOptions.value = []
  }
}
function openTramitarDialog() {
  tramitarForm.value = { destinoSetor: null, motivo: '', prioridade: null, prazo: '' }
  loadSetoresOptions()
  tramitarDialogOpen.value = true
}
async function tramitarSubmit() {
  try {
    const { id } = route.params
    const payload = {
      destinoSetor: tramitarForm.value.destinoSetor || undefined,
      usuario: getUsuarioLogin(),
      motivo: tramitarForm.value.motivo || undefined,
      prioridade: tramitarForm.value.prioridade || undefined,
      prazo: tramitarForm.value.prazo || undefined,
    }
    await tramitarProcesso(id, payload)
    $q.notify({ type: 'positive', message: 'Processo tramitado' })
    tramitarDialogOpen.value = false
    router.push('/dashboard')
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'warning', message: e?.response?.data?.error || 'Falha ao tramitar' })
  }
}

function arquivarSubmit() {
  $q.dialog({
    title: 'Arquivar processo',
    message: 'Confirma arquivar este processo? Esta ação remove a atribuição.',
    cancel: true,
    ok: { label: 'Arquivar', color: 'primary' },
  }).onOk(async () => {
    try {
      const { id } = route.params
      await arquivarProcesso(id, { usuario: getUsuarioLogin() })
      $q.notify({ type: 'positive', message: 'Processo arquivado' })
      router.push('/dashboard')
    } catch (e) {
      console.error(e)
      $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Falha ao arquivar' })
    }
  })
}

// Atribuir
const atribuirDialogOpen = ref(false)
const atribuirForm = ref({ usuario: null })
const usuariosOptions = ref([])
async function loadUsuariosDoSetorAtual() {
  try {
    const setor = String(processo.value?.setor || '').toUpperCase()
    if (!setor) {
      usuariosOptions.value = []
      return
    }
    const data = await listarUsuarios({ setor })
    usuariosOptions.value = (data || []).map((u) => ({
      label: `${u.nome || u.username} (${u.username})`,
      value: u.username,
    }))
  } catch (e) {
    console.error(e)
    usuariosOptions.value = []
  }
}
async function openAtribuirDialog() {
  await loadUsuariosDoSetorAtual()
  atribuirDialogOpen.value = true
}
async function atribuirSubmit() {
  try {
    const { id } = route.params
    const usuario = atribuirForm.value.usuario
    if (!usuario) {
      $q.notify({ type: 'warning', message: 'Selecione o usuário' })
      return
    }
    await atribuirProcesso(id, { usuario, executadoPor: getUsuarioLogin() })
    $q.notify({ type: 'positive', message: 'Processo atribuído' })
    atribuirDialogOpen.value = false
    const proc = await getProcesso(id)
    processo.value = proc
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'warning', message: e?.response?.data?.error || 'Falha ao atribuir' })
  }
}

// Prioridade
const prioridadeDialogOpen = ref(false)
const prioridadeForm = ref({ prioridade: 'Normal' })
function openPrioridadeDialog() {
  prioridadeForm.value.prioridade = String(processo.value?.prioridade || 'Normal')
  prioridadeDialogOpen.value = true
}
async function prioridadeSubmit() {
  try {
    const { id } = route.params
    await atualizarPrioridade(id, {
      prioridade: prioridadeForm.value.prioridade,
      executadoPor: getUsuarioLogin(),
    })
    $q.notify({ type: 'positive', message: 'Prioridade atualizada' })
    prioridadeDialogOpen.value = false
    const proc = await getProcesso(id)
    processo.value = proc
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'warning',
      message: e?.response?.data?.error || 'Falha ao marcar prioridade',
    })
  }
}

// Histórico
const historicoDialogOpen = ref(false)
const historicoLoading = ref(false)
const historicoItems = ref([])
const historicoColumns = [
  { name: 'data', label: 'Data', field: 'data', align: 'left' },
  { name: 'movimento', label: 'Movimento', field: 'movimento', align: 'left' },
  { name: 'prioridade', label: 'Prioridade', field: 'prioridade', align: 'left' },
  { name: 'prazo', label: 'Prazo', field: 'prazo', align: 'left' },
  { name: 'usuario', label: 'Usuário Origem', field: 'usuario', align: 'left' },
  { name: 'motivo', label: 'Motivo', field: 'motivo', align: 'left' },
]
function openHistoricoDialog() {
  historicoDialogOpen.value = true
  loadHistorico()
}
async function loadHistorico() {
  historicoLoading.value = true
  try {
    const { id } = route.params
    historicoItems.value = await listarTramites(id)
  } catch (e) {
    console.error(e)
    historicoItems.value = []
  } finally {
    historicoLoading.value = false
  }
}
function formatDateTime(val) {
  try {
    const dt = new Date(val)
    return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch (_e) {
    return String(val || '')
  }
}

// Criar documento
const criarDocDialogOpen = ref(false)
const docCreateForm = ref({
  titulo: '',
  tipo: 'Documento',
  modo: 'Editor',
  arquivo: null,
  conteudo: '',
})
const tipoDocOptions = ['Documento', 'Requerimento', 'Ofício', 'Memorando', 'Despacho']
const modoDocOptions = [
  { label: 'Editor', value: 'Editor' },
  { label: 'Upload', value: 'Upload' },
]
function openCriarDocDialog() {
  docCreateForm.value = {
    titulo: '',
    tipo: 'Documento',
    modo: 'Editor',
    arquivo: null,
    conteudo: '',
  }
  criarDocDialogOpen.value = true
}
async function criarDocSubmit() {
  try {
    if (!docCreateForm.value.titulo) {
      $q.notify({ type: 'warning', message: 'Informe o título do documento' })
      return
    }
    const autorLogin = getUsuarioLogin() || undefined
    const doc = await createDocumento({
      titulo: docCreateForm.value.titulo,
      tipo: docCreateForm.value.tipo,
      modo: docCreateForm.value.modo,
      autorLogin,
    })
    // Primeiro vincula ao processo para satisfazer validações de árvore
    const procId = processo.value?.id || route.params.id
    await linkDocumentoToProcesso(procId, doc.id, getUsuarioLogin() || undefined)

    // Depois atualiza conteúdo conforme modo selecionado
    if (docCreateForm.value.modo === 'Upload' && docCreateForm.value.arquivo) {
      const base64 = await fileToBase64(docCreateForm.value.arquivo)
      await uploadConteudo(
        doc.id,
        docCreateForm.value.arquivo.name || 'arquivo.bin',
        base64,
        autorLogin,
      )
    } else if (docCreateForm.value.modo === 'Editor' && docCreateForm.value.conteudo) {
      await updateEditorConteudo(doc.id, docCreateForm.value.conteudo, autorLogin)
    }

    $q.notify({ type: 'positive', message: 'Documento criado e vinculado' })
    criarDocDialogOpen.value = false
    await loadDocumentos()
    selectedKey.value = doc.id
    await loadDocumento(doc.id)
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Falha ao criar documento' })
  }
}

// ACL state and actions
const aclDialogOpen = ref(false)
const acessos = ref([])
const aclLoading = ref(false)
const aclForm = ref({ tipo: 'SETOR', valor: null, parteId: null })
const usuariosAcessoOptions = ref([])

async function openAclDialog() {
  await loadSetoresOptions()
  await loadUsuariosOptionsAll()
  await loadAcl()
  aclDialogOpen.value = true
}

async function loadUsuariosOptionsAll() {
  try {
    const data = await listarUsuarios({})
    usuariosAcessoOptions.value = (data || []).map((u) => ({
      label: `${u.nome} (${u.username})`,
      value: u.username,
    }))
  } catch (e) {
    console.error(e)
    usuariosAcessoOptions.value = []
  }
}

watch(
  () => aclForm.value.tipo,
  async (novo) => {
    if (novo === 'SETOR') {
      await loadSetoresOptions()
    } else if (novo === 'USUARIO') {
      await loadUsuariosOptionsAll()
    }
  },
)

async function loadAcl() {
  aclLoading.value = true
  try {
    const { id } = route.params
    acessos.value = await listarAcessos(id)
  } catch (e) {
    console.error(e)
    acessos.value = []
  } finally {
    aclLoading.value = false
  }
}

async function addAcessoSubmit() {
  const tipo = aclForm.value.tipo
  if (!tipo) return

  const payload = {
    tipo,
    valor: tipo === 'PARTE' ? undefined : aclForm.value.valor,
    parteId: tipo === 'PARTE' ? aclForm.value.parteId : undefined,
    executadoPor: getUsuarioLogin(),
  }

  if (tipo === 'PARTE') {
    if (!payload.parteId) {
      $q.notify({ type: 'warning', message: 'Selecione a parte.' })
      return
    }
  } else if (!payload.valor) {
    $q.notify({ type: 'warning', message: 'Preencha o valor.' })
    return
  }

  try {
    const { id } = route.params
    await adicionarAcesso(id, payload)
    $q.notify({ type: 'positive', message: 'Acesso adicionado' })
    await loadAcl()
    aclForm.value = { tipo: 'SETOR', valor: null, parteId: null }
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || 'Falha ao adicionar acesso',
    })
  }
}

async function removerAcessoRow(row) {
  try {
    const { id } = route.params
    const nivelAtual = String(processo.value?.nivelAcesso || 'Público')
    const isUserOrSetor = row?.tipo === 'USUARIO' || row?.tipo === 'SETOR'
    if (nivelAtual !== 'Público' && isUserOrSetor) {
      const count = (acessos.value || []).filter(
        (a) => a.tipo === 'USUARIO' || a.tipo === 'SETOR',
      ).length
      if (count <= 1) {
        $q.notify({
          type: 'warning',
          message:
            'Processos restritos/sigilosos precisam de pelo menos um usuário ou setor com acesso.',
        })
        return
      }
    }
    await removerAcesso(id, row.id, { executadoPor: getUsuarioLogin() })
    $q.notify({ type: 'positive', message: 'Acesso removido' })
    await loadAcl()
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Falha ao remover acesso' })
  }
}
</script>

<style scoped></style>
