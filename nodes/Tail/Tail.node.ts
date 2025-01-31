import {
    IDataObject,
    INodeType,
    INodeTypeDescription,
    ITriggerFunctions,
    ITriggerResponse,
} from 'n8n-workflow';
import {spawn} from 'child_process';

export class Tail implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Tail Trigger',
        name: 'tail',
        icon: 'fa:terminal',
        group: ['trigger'],
        version: 1,
        triggerPanel: true,
        subtitle: '={{$parameter["file"]}}',
        description: 'Starts the workflow when lines are added to this file',
        defaults: {
            name: 'Tail Trigger',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Directory',
                name: 'directory',
                type: 'string',
                default: '/home/user/',
                required: true,
                description: 'Define a working directory',
            },
            {
                displayName: 'File Expression',
                name: 'file',
                type: 'string',
                default: 'file*.log',
                required: true,
                description: 'Specify file expression to monitor for real-time updates',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                options: [
                    {
                        displayName: 'Include Previous Lines',
                        name: 'nLines',
                        type: 'number',
                        default: 0,
                        description: 'How many previous lines are loaded on startup? (-n option)',
                    },
                    {
                        displayName: 'Reject Duplicate Lines',
                        name: 'deduplicate',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to reject lines that are identical to the previous one',
                    },
                ],
            },
        ],
    };

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        // Parameters & Options
        const directory = this.getNodeParameter('directory') as string;
        const file = this.getNodeParameter('file') as string;

        const options = this.getNodeParameter('options') as IDataObject;
        const nLines = options.nLines as number || 0;
        const deduplicate = options.deduplicate as boolean;

        // Command shell
        const command: string = `tail -F -n ${nLines} ${directory}${file}`;
        console.log(`Tail process starting on ${directory}${file}`);

        let child = spawn('sh',['-c', command]);

        child.stderr.pipe(process.stderr); // Redirect stderr to the console for error output.

        let previous = "";
        child.stdout.on('data', (data: Buffer) => {
            const lines: string[] = data
                .toString()
                .split('\n')
                .filter((line) => line.trim() !== ''); // Split lines and filter out empty lines

            for (const line of lines) {
                if (!deduplicate || line !== previous) { // Reject Duplicate Lines
                    this.emit([this.helpers.returnJsonArray([{line: line}])]);
                }
                previous = line;
            }
        });

        child.on('close', (code, signal) => {
            console.log(`Tail process terminated on ${directory}${file}`);
        });

        child.stderr.on('data', (error: Buffer) => {
            closeFunction();
            this.emitError(new Error(error.toString()));
        });

        async function closeFunction() {
            child.kill('SIGHUP');
        }

        return {
            closeFunction,
        };
    }
}
