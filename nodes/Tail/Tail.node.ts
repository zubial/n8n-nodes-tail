import { INodeType, INodeTypeDescription, ITriggerFunctions, ITriggerResponse } from 'n8n-workflow';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

export class Tail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tail Trigger',
		name: 'tail',
		icon: 'fa:terminal',
		group: ['trigger'],
		version: 1,
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
				displayName: 'File',
				name: 'file',
				type: 'string',
				default: 'file.log',
				required: true,
				description: 'Specify a file to monitor for real-time updates',
			},
			{
				displayName: 'Last Lines',
				name: 'last',
				type: 'number',
				default: 0,
				required: true,
				description: 'How many last lines are loaded on startup?',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const directory = this.getNodeParameter('directory') as string;
		const file = this.getNodeParameter('file') as string;
		const last = this.getNodeParameter('last') as number;

		const args: string[] = ['-f', '-n', last.toString(), directory + file];
		console.log(args);

		let child: ChildProcessWithoutNullStreams = spawn('tail', args);
		child.stderr.pipe(process.stderr); // Redirect stderr to the console for error output.

		child.stdout.on('data', (data: Buffer) => {
			console.log(data.toString());

			const lines: string[] = data
				.toString()
				.split('\n')
				.filter((line) => line.trim() !== ''); // Split lines and filter out empty lines

			for (const line of lines) {
				this.emit([this.helpers.returnJsonArray([{ line: line }])]);
			}
		});

		child.stderr.on('data', (error: Buffer) => {
			child.kill();
			this.emit([this.helpers.returnJsonArray([{ error: error.toString() }])]);
		});

		async function closeFunction() {
			child.kill();
		}

		return {
			closeFunction,
		};
	}
}
